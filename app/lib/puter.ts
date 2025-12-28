import { create } from "zustand";

const DEFAULT_AI_MODEL = "anthropic/claude-sonnet-4";

declare global {
  interface Window {
    puter: {
      auth: {
        getUser: () => Promise<any>;
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
      };
      fs: {
        write: (path: string, data: string | File | Blob) => Promise<any>;
        read: (path: string) => Promise<any>;
        upload: (file: File[] | Blob[]) => Promise<any>;
        delete: (path: string) => Promise<any>;
        readdir: (path: string) => Promise<any>;
      };
      ai: {
        chat: (
          prompt: string | ChatMessage[],
          imageURL?: string | PuterChatOptions,
          testMode?: boolean,
          options?: PuterChatOptions
        ) => Promise<any>;
        img2txt: (
          image: string | File | Blob,
          testMode?: boolean
        ) => Promise<any>;
      };
      kv: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: string) => Promise<any>;
        delete: (key: string) => Promise<any>;
        list: (pattern: string, returnValues?: boolean) => Promise<any>;
        flush: () => Promise<any>;
      };
    };
  }
}

interface PuterStore {
  isLoading: boolean;
  error: string | null;
  puterReady: boolean;
  auth: {
    user: PuterUser | null;
    isAuthenticated: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    checkAuthStatus: () => Promise<boolean>;
    getUser: () => PuterUser | null;
  };
  fs: {
    write: (path: string, data: string | File | Blob) => Promise<any>;
    read: (path: string) => Promise<any>;
    upload: (file: File[] | Blob[]) => Promise<any>;
    delete: (path: string) => Promise<any>;
    readDir: (path: string) => Promise<any>;
  };
  ai: {
    chat: (
      prompt: string | ChatMessage[],
      imageURL?: string | PuterChatOptions,
      testMode?: boolean,
      options?: PuterChatOptions
    ) => Promise<AIResponse | undefined>;
    feedback: (path: string, message: string) => Promise<any>;
    img2txt: (image: string | File | Blob, testMode?: boolean) => Promise<any>;
  };
  kv: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: string) => Promise<any>;
    delete: (key: string) => Promise<any>;
    list: (pattern: string, returnValues?: boolean) => Promise<any>;
    flush: () => Promise<any>;
  };
  init: () => void;
  clearError: () => void;
}

const getPuter = (): typeof window.puter | null =>
  typeof window !== "undefined" && window.puter ? window.puter : null;

export const usePuterStore = create<PuterStore>((set, get) => {
  let initStarted = false;
  let initInterval: ReturnType<typeof setInterval> | null = null;
  let initTimeout: ReturnType<typeof setTimeout> | null = null;

  const setError = (msg: string) => {
    set({ error: msg, isLoading: false });
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return false;
    }
    set({ isLoading: true, error: null });
    try {
      const isSignedIn = await puter.auth.isSignedIn();
      if (isSignedIn) {
        const user = await puter.auth.getUser();
        set({
          auth: {
            ...get().auth,
            user,
            isAuthenticated: true,
            getUser: () => user,
          },
          isLoading: false,
        });
        return true;
      }
      set({
        auth: {
          ...get().auth,
          user: null,
          isAuthenticated: false,
          getUser: () => null,
        },
        isLoading: false,
      });
      return false;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to check auth status";
      setError(msg);
      return false;
    }
  };

  const signIn = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await puter.auth.signIn();
      await checkAuthStatus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
    }
  };

  const signOut = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await puter.auth.signOut();
      set({
        auth: {
          ...get().auth,
          user: null,
          isAuthenticated: false,
          getUser: () => null,
        },
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign out failed";
      setError(msg);
    }
  };

  const refreshUser = async (): Promise<void> => {
    const puter = getPuter();
    if (!puter) {
      setError("Puter.js not available");
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const user = await puter.auth.getUser();
      set({
        auth: {
          ...get().auth,
          user,
          isAuthenticated: true,
          getUser: () => user,
        },
        isLoading: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refresh user";
      setError(msg);
    }
  };

  const init = (): void => {
    if (initStarted || get().puterReady) return;
    initStarted = true;

    const puter = getPuter();
    if (puter) {
      set({ puterReady: true, isLoading: false });
      void checkAuthStatus();
      return;
    }

    if (initInterval) clearInterval(initInterval);
    if (initTimeout) clearTimeout(initTimeout);

    initInterval = setInterval(() => {
      if (getPuter()) {
        if (initInterval) clearInterval(initInterval);
        initInterval = null;
        set({ puterReady: true, isLoading: false });
        void checkAuthStatus();
      }
    }, 100);

    initTimeout = setTimeout(() => {
      if (initInterval) clearInterval(initInterval);
      initInterval = null;
      if (!getPuter()) setError("Puter.js failed to load within 10 seconds");
    }, 10000);
  };

  const write = async (path: string, data: string | File | Blob) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.fs.write(path, data);
  };

  const readDir = async (path: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.fs.readdir(path);
  };

  const readFile = async (path: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.fs.read(path);
  };

  const upload = async (files: File[] | Blob[]) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.fs.upload(files);
  };

  const deleteFile = async (path: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.fs.delete(path);
  };

  const chat = async (
    prompt: string | ChatMessage[],
    imageURL?: string | PuterChatOptions,
    testMode?: boolean,
    options?: PuterChatOptions
  ) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.ai.chat(prompt, imageURL, testMode, options) as Promise<
      AIResponse | undefined
    >;
  };

  const feedback = async (path: string, message: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.ai.chat(
      [
        {
          role: "user",
          content: [
            { type: "file", puter_path: path },
            { type: "text", text: message },
          ],
        },
      ],
      { model: DEFAULT_AI_MODEL }
    ) as Promise<any>;
  };

  const img2txt = async (image: string | File | Blob, testMode?: boolean) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.ai.img2txt(image, testMode);
  };

  const getKV = async (key: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.kv.get(key);
  };

  const setKV = async (key: string, value: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.kv.set(key, value);
  };

  const deleteKV = async (key: string) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.kv.delete(key);
  };

  const listKV = async (pattern: string, returnValues?: boolean) => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.kv.list(pattern, returnValues ?? false);
  };

  const flushKV = async () => {
    const puter = getPuter();
    if (!puter) return setError("Puter.js not available");
    return puter.kv.flush();
  };

  return {
    isLoading: false,
    error: null,
    puterReady: false,
    auth: {
      user: null,
      isAuthenticated: false,
      signIn,
      signOut,
      refreshUser,
      checkAuthStatus,
      getUser: () => get().auth.user,
    },
    fs: {
      write,
      read: readFile,
      readDir,
      upload,
      delete: deleteFile,
    },
    ai: {
      chat,
      feedback,
      img2txt,
    },
    kv: {
      get: getKV,
      set: setKV,
      delete: deleteKV,
      list: listKV,
      flush: flushKV,
    },
    init,
    clearError: () => set({ error: null }),
  };
});
