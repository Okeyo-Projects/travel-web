export type PayzoneSession = {
  paymentId: string;
  paywallUrl: string;
  payload: string;
  signature: string;
};

export type PayzoneReturnStatus = "success" | "failure" | "cancel";

type SearchParamsLike = {
  get(name: string): string | null;
};

export function isPayzoneSession(value: unknown): value is PayzoneSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.paymentId === "string" &&
    session.paymentId.length > 0 &&
    typeof session.paywallUrl === "string" &&
    /^https?:\/\//.test(session.paywallUrl) &&
    typeof session.payload === "string" &&
    session.payload.length > 0 &&
    typeof session.signature === "string" &&
    session.signature.length > 0
  );
}

export function readPayzoneReturnParams(params: SearchParamsLike): {
  paymentId: string | null;
  status: PayzoneReturnStatus | null;
} {
  const paymentId = params.get("paymentId");
  const status = params.get("payzoneStatus");

  if (status === "success" || status === "failure" || status === "cancel") {
    return { paymentId, status };
  }

  return { paymentId, status: null };
}
