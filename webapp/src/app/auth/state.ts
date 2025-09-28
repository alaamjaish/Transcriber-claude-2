export interface AuthFormState {
  message: string | null;
  messageType?: "success" | "error";
}

export const initialAuthState: AuthFormState = { message: null, messageType: undefined };
