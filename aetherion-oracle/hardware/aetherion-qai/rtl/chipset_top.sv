// chipset_top.sv — AQAI paradigm chipset fabric stub (Soft→Hard)
`timescale 1ns/1ps
module chipset_top (
  input  logic        clk,
  input  logic        rst_n,
  input  logic [31:0] instr,
  input  logic [63:0] rs1,
  input  logic [63:0] rs2,
  input  logic [15:0] t_r,
  input  logic [15:0] t_l,
  input  logic [15:0] sk_gamma,
  input  logic        localize,
  input  logic [31:0] ep_gamma,
  input  logic [31:0] ep_kappa,
  input  logic        seal_commit,
  input  logic        seal_verify,
  input  logic [63:0] seal_expected,
  input  logic        sphinx_start,
  output logic [63:0] rd,
  output logic        halt,
  output logic [63:0] braid_probe,
  output logic [15:0] edge_metric,
  output logic        at_ep,
  output logic        pt_broken,
  output logic [63:0] seal_digest,
  output logic        seal_ok,
  output logic [63:0] sphinx_digest,
  output logic [63:0] unity_out,
  output logic        unity_at_x1
);
  logic [63:0] core_rd;
  logic        seal_sealed;
  logic        sphinx_done;
  qai_core u_core (
    .clk(clk), .rst_n(rst_n), .instr(instr),
    .rs1_data(rs1), .rs2_data(rs2), .rd_data(core_rd), .halt(halt)
  );
  caduceus_alu u_alu (
    .sphinx_i(rs1), .anubis_i(rs2), .braid_o(braid_probe)
  );
  skin_memory #(.N(32)) u_skin (
    .clk(clk), .rst_n(rst_n),
    .t_r(t_r), .t_l(t_l), .gamma_q(sk_gamma),
    .localize(localize), .profile(), .edge_metric(edge_metric)
  );
  ep_gate u_ep (
    .clk(clk), .rst_n(rst_n),
    .gamma_q(ep_gamma), .kappa_q(ep_kappa),
    .e_re(), .e_im(), .at_ep(at_ep), .pt_broken(pt_broken)
  );
  seal_ioc u_seal (
    .clk(clk), .rst_n(rst_n),
    .commit(seal_commit), .payload_lo(rs1), .payload_hi(rs2),
    .expected(seal_expected), .verify(seal_verify),
    .digest(seal_digest), .sealed(seal_sealed), .ok(seal_ok)
  );
  sphinx_hash u_sphinx (
    .clk(clk), .rst_n(rst_n),
    .start(sphinx_start), .seed(rs1), .block(rs2),
    .digest(sphinx_digest), .done(sphinx_done)
  );
  unity_gate u_unity (
    .x_in(rs1), .unity_out(unity_out), .at_x1(unity_at_x1)
  );
  assign rd = core_rd;
endmodule
