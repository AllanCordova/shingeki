export const ATTACK_ACKNOWLEDGMENT = {
  termsVersion: "2026-07-13",
  responsibilityCode: "SHINGEKI-ATTACK-ACK-1",
} as const;

export type AttackAcknowledgmentPayload = {
  accepted_responsibility: boolean;
  accepted_legal_terms: boolean;
  terms_version: string;
};
