// sphinx_hash.sv — SphinxHash lane (soft→hard continuity for sphinxHash.ts)
`timescale 1ns/1ps
module sphinx_hash (
  input  logic        clk,
  input  logic        rst_n,
  input  logic        start,
  input  logic [63:0] seed,
  input  logic [63:0] block,
  output logic [63:0] digest,
  output logic        done
);
  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      digest <= 64'd0;
      done   <= 1'b0;
    end else if (start) begin
      // Avalanche stub aligned with Soft Silicon sphinxFold
      digest <= (seed * 64'hC2B2AE3D27D4EB4F) ^ (block + 64'h165667B19E3779F9) ^ (seed << 13);
      done   <= 1'b1;
    end else begin
      done <= 1'b0;
    end
  end
endmodule
