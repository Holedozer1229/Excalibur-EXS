// chipset_top_fpga.sv — AQAI G2 FPGA board wrapper (Arty A7)
`timescale 1ns/1ps

module chipset_top_fpga (
  input  logic       sys_clk,
  input  logic       rst_n,
  output logic [3:0] led,
  output logic       uart_tx,
  input  logic       uart_rx
);
  logic clk;
  logic locked;
  // Direct clock — Arty A7 100 MHz (no MMCM for minimal demo)
  assign clk = sys_clk;

  logic [31:0] instr;
  logic [63:0] rs1, rs2, rd;
  logic        halt;
  logic [63:0] braid_probe;
  logic [15:0] edge_metric;
  logic        at_ep, pt_broken;
  logic [63:0] seal_digest;
  logic        seal_ok;
  logic [63:0] sphinx_digest;
  logic [63:0] unity_out;
  logic        unity_at_x1;

  logic        seal_commit, seal_verify;
  logic [63:0] seal_expected;
  logic        localize;
  logic [15:0] t_r, t_l, sk_gamma;
  logic [31:0] ep_gamma, ep_kappa;
  logic        sphinx_start;

  // Default demo vectors — overridden by UART host
  assign instr        = 32'h00000000;
  assign t_r          = 16'd1536;  // 1.5 in Q10.6-ish scale
  assign t_l          = 16'd512;
  assign sk_gamma     = 16'd0;
  assign ep_gamma     = 32'd10;    // γ=1.0 in Q4.4
  assign ep_kappa     = 32'd16;
  assign sphinx_start = 1'b0;

  chipset_top u_chip (
    .clk(sys_clk), .rst_n(rst_n), .instr(instr),
    .rs1(rs1), .rs2(rs2),
    .t_r(t_r), .t_l(t_l), .sk_gamma(sk_gamma),
    .localize(localize),
    .ep_gamma(ep_gamma), .ep_kappa(ep_kappa),
    .seal_commit(seal_commit), .seal_verify(seal_verify),
    .seal_expected(seal_expected),
    .sphinx_start(sphinx_start),
    .rd(rd), .halt(halt),
    .braid_probe(braid_probe), .edge_metric(edge_metric),
    .at_ep(at_ep), .pt_broken(pt_broken),
    .seal_digest(seal_digest), .seal_ok(seal_ok),
    .sphinx_digest(sphinx_digest),
    .unity_out(unity_out), .unity_at_x1(unity_at_x1)
  );

  uart_seal_demo u_uart (
    .clk(sys_clk), .rst_n(rst_n),
    .rx(uart_rx), .tx(uart_tx),
    .seal_commit(seal_commit), .seal_verify(seal_verify),
    .payload_lo(rs1), .payload_hi(rs2),
    .seal_expected(seal_expected),
    .localize(localize),
    .seal_digest(seal_digest), .seal_ok(seal_ok)
  );

  assign led[0] = seal_ok;
  assign led[1] = at_ep;
  assign led[2] = pt_broken;
  assign led[3] = halt;
endmodule
