import { invalidateReads } from "../../shared/pagination";
type Result = { data: any; error: any; count?: number };
const listeners = new Set<(event: string, session: any) => void>();
async function invoke(method: string, ...args: any[]): Promise<any> {
  if (!window.restDesktop)
    throw new Error("Abra o REST Desktop através da aplicação Windows.");
  return (window.restDesktop as any)[method](...args);
}
class Query implements PromiseLike<Result> {
  private request: any;
  constructor(table: string) {
    this.request = { table, action: "select", filters: [], orders: [] };
  }
  select(columns = "*", _options?: any) {
    this.request.select = columns;
    return this;
  }
  insert(payload: any) {
    this.request.action = "insert";
    this.request.payload = payload;
    return this;
  }
  upsert(payload: any, _options?: any) {
    this.request.action = "upsert";
    this.request.payload = payload;
    return this;
  }
  update(payload: any) {
    this.request.action = "update";
    this.request.payload = payload;
    return this;
  }
  delete() {
    this.request.action = "delete";
    return this;
  }
  eq(column: string, value: any) {
    this.request.filters.push({ column, value, op: "eq" });
    return this;
  }
  ilike(column: string, value: any) {
    this.request.filters.push({ column, value, op: "ilike" });
    return this;
  }
  in(column: string, value: any[]) {
    this.request.filters.push({ column, value, op: "in" });
    return this;
  }
  gte(column: string, value: any) {
    this.request.filters.push({ column, value, op: "gte" });
    return this;
  }
  lte(column: string, value: any) {
    this.request.filters.push({ column, value, op: "lte" });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.request.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }
  range(from: number, to: number) {
    this.request.range = [from, to];
    return this;
  }
  single() {
    this.request.single = "required";
    return this;
  }
  maybeSingle() {
    this.request.single = "optional";
    return this;
  }
  async execute(): Promise<Result> {
    const write = this.request.action !== "select";
    if (write) invalidateReads();
    try {
      return await invoke("query", this.request);
    } catch (e: any) {
      console.error(e.message);
      return { data: null, error: { message: e.message } };
    } finally {
      if (write) invalidateReads();
    }
  }
  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
async function authCall(action: string, payload?: any) {
  try {
    const data = await invoke("auth", action, payload);
    if (
      action === "signInWithPassword" ||
      action === "signOut" ||
      action === "changePassword" ||
      action === "recover"
    ) {
      invalidateReads();
      for (const listener of listeners) listener(action, data.session || null);
    }
    return { data, error: null };
  } catch (e: any) {
    return {
      data: { user: null, session: null },
      error: { message: e.message },
    };
  }
}
export const localClient = {
  from: (table: string) => new Query(table),
  rpc: async (operation: string, payload: any) => {
    invalidateReads();
    try {
      return await invoke("rpc", operation, payload);
    } catch (e: any) {
      console.error(e.message);
      return { data: null, error: { message: e.message, code: "PLOCAL" } };
    } finally {
      invalidateReads();
    }
  },
  auth: {
    getSession: () => authCall("getSession"),
    getUser: () => authCall("getUser"),
    signInWithPassword: (payload: any) =>
      authCall("signInWithPassword", payload),
    signUp: (payload: any) => authCall("signUp", payload),
    signOut: () => authCall("signOut"),
    recover: (payload: any) => authCall("recover", payload),
    changePassword: (payload: any) => authCall("changePassword", payload),
    onAuthStateChange: (listener: (event: string, session: any) => void) => {
      listeners.add(listener);
      return {
        data: {
          subscription: { unsubscribe: () => listeners.delete(listener) },
        },
      };
    },
  },
};
