// skin_memory.sv — Hatano–Nelson skin-effect memory tile (sim stub)
`timescale 1ns/1ps
module skin_memory #(
  parameter int N = 32
) (
  input  logic                clk,
  input  logic                rst_n,
  input  logic [15:0]         t_r,      // right hop
  input  logic [15:0]         t_l,      // left hop
  input  logic [15:0]         gamma_q,  // asymmetry (fixed-point)
  input  logic                localize, // pulse: recompute edge profile
  output logic [N-1:0][15:0]  profile,  // |ψ|² stub per site
  output logic [15:0]         edge_metric
);
  // Under OBC + asymmetry, mass piles at one edge (paradigm axiom 3).
  integer i;
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      for (i = 0; i < N; i++) profile[i] <= 16'd0;
      edge_metric <= 16'd0;
    end else if (localize) begin
      // Exponential pile-up toward site N-1 when t_r > t_l
      for (i = 0; i < N; i++) begin
        profile[i] <= (t_r > t_l)
          ? (16'h0001 << (i >> 2))
          : (16'h8000 >> (i >> 2));
      end
      edge_metric <= (t_r > t_l) ? profile[N-1] : profile[0];
    end
  end
endmodule
