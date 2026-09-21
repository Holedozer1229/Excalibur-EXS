// uart_seal_demo.sv — Minimal host protocol for G2 seal round-trip
`timescale 1ns/1ps

module uart_seal_demo (
  input  logic       clk,
  input  logic       rst_n,
  input  logic       rx,
  output logic       tx,
  output logic       seal_commit,
  output logic       seal_verify,
  output logic [63:0] payload_lo,
  output logic [63:0] payload_hi,
  output logic [63:0] seal_expected,
  output logic       localize,
  input  logic [63:0] seal_digest,
  input  logic       seal_ok
);
  // Stub FSM — synthesis-friendly; full UART in production testbench
  typedef enum logic [2:0] { IDLE, COMMIT, VERIFY, DONE } state_t;
  state_t state;

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      state        <= IDLE;
      seal_commit  <= 1'b0;
      seal_verify  <= 1'b0;
      localize     <= 1'b0;
      payload_lo   <= 64'hcafebab000000001;
      payload_hi   <= 64'hdeadbeef00000002;
      seal_expected<= 64'd0;
    end else begin
      seal_commit <= 1'b0;
      seal_verify <= 1'b0;
      localize    <= 1'b0;
      case (state)
        IDLE: begin
          // Auto-run demo sequence once after reset
          state <= COMMIT;
        end
        COMMIT: begin
          seal_commit <= 1'b1;
          localize    <= 1'b1;
          state       <= VERIFY;
        end
        VERIFY: begin
          seal_expected <= seal_digest; // round-trip expected = committed digest
          seal_verify   <= 1'b1;
          state         <= DONE;
        end
        DONE: state <= DONE;
      endcase
    end
  end

  assign tx = 1'b1; // idle high — real UART TX in testbench
endmodule
