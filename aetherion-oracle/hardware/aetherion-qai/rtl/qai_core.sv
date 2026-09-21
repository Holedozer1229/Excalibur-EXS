// qai_core.sv — AQAI Caduceus core (simulation-first SystemVerilog)
`timescale 1ns/1ps
module qai_core (
  input  logic        clk,
  input  logic        rst_n,
  input  logic [31:0] instr,
  input  logic [63:0] rs1_data,
  input  logic [63:0] rs2_data,
  output logic [63:0] rd_data,
  output logic        halt
);
  // Opcode decode (see docs/01-isa.md)
  wire [3:0]  opc = instr[31:28];
  wire [7:0]  fun = instr[27:20];
  wire        is_cad = (opc == 4'hC);

  always_ff @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      rd_data <= 64'd0;
      halt    <= 1'b0;
    end else if (is_cad) begin
      unique case (fun)
        8'h01: rd_data <= rs1_data ^ {rs2_data[31:0], rs2_data[63:32]}; // BRAID
        8'h02: rd_data <= ~rs1_data;                                     // REFLECT
        8'h03: rd_data <= rs1_data + rs2_data;                            // SEAL length stub
        8'h05: rd_data <= (rs1_data * 64'h9E3779B97F4A7C15) ^ rs1_data; // TAROT
        8'h07: rd_data <= rs1_data ^ (rs2_data << 3);                     // OCT stub
        8'h08: rd_data <= rs1_data;                                       // SKIN stub
        8'h09: rd_data <= rs1_data ^ rs2_data;                            // EP stub
        8'h0A: rd_data <= (rs1_data * 64'hFF51AFD7ED558CCD) ^ rs1_data; // POM
        8'h0B: rd_data <= (rs1_data == rs2_data) ? 64'd1 : 64'd0;         // VERIFY
        8'h0C: rd_data <= (rs1_data * 64'hC2B2AE3D27D4EB4F) ^ (rs2_data + 64'h165667B19E3779F9); // SPHINX
        8'h0D: rd_data <= rs1_data + rs2_data;                            // LATTICE
        8'h0E: rd_data <= rs1_data ^ 64'hAETHER10N0000001;               // COMMIT
        8'h10: rd_data <= 64'd1;                                         // UNITY cos(0) stub
        8'h11: rd_data <= (rs1_data == rs2_data) ? 64'd1 : 64'd0;       // SCHNORR verify stub
        8'h0F: begin rd_data <= rd_data; halt <= 1'b1; end
        default: rd_data <= rs1_data;
      endcase
    end
  end
endmodule
