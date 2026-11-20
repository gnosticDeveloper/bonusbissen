// Server Actions cannot be cancelled in transit. Abort invalidates their results locally.
export class RequestGate {
  readonly controller = new AbortController();
  private locked = false;

  async run(task: (signal: AbortSignal) => Promise<void>): Promise<boolean> {
    if (this.locked || this.controller.signal.aborted) return false;
    this.locked = true;
    try { await task(this.controller.signal); }
    finally { this.locked = false; }
    return true;
  }

  abort() { this.controller.abort(); }
}

export const POLL_INTERVAL_MS = 5_000;
export const MAX_AUTOMATIC_CHECKS = 12;

export class PollBudget {
  private checks = 0;
  take() {
    if (this.checks >= MAX_AUTOMATIC_CHECKS) return false;
    this.checks += 1;
    return true;
  }
}
