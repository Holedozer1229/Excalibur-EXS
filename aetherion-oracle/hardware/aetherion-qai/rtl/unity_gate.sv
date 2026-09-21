// unity_gate.sv — Unity Seal lane: f(x)=cos(0), anchor x=1 (simulation stub)
// cos(0)=1 exactly; RTL does not evaluate transcendental cos — outputs unity constant.
`timescale 1ns/1ps
module unity_gate (
  input  logic [63:0] x_in,
  output logic [63:0] unity_out,
  output logic        at_x1
);
  assign at_x1    = (x_in == 64'd1);
  assign unity_out = 64'd1; // cos(0) stub — unity constant in pipeline
endmodule
