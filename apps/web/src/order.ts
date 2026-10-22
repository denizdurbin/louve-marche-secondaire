/** The purchase the client is considering, shared by the yield simulator and the email flow. */
export interface DraftOrder {
  shares: number;
  /** Price per share excluding fees (net vendeur), in euros. */
  netPrice: number;
}
