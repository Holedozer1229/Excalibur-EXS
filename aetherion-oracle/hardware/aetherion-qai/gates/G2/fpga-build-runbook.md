# G2 — FPGA build runbook (Vivado / Artix-7)

Target board: **Digilent Arty A7-100T**  
Toolchain: **Vivado 2023.2+** (WebPACK)  
Top module: `chipset_top_fpga`

## Prerequisites

```bash
# Vivado on PATH
source /tools/Xilinx/Vivado/2023.2/settings64.sh

# Repo root
cd hardware/aetherion-qai
```

## File list

| File | Role |
|------|------|
| `rtl/chipset_top.sv` | Soft→Hard reference top |
| `rtl/seal_ioc.sv` | Seal commit/verify |
| `rtl/unity_gate.sv` | Unity Seal lane f(x)=cos(0), x=1 |
| `rtl/skin_memory.sv` | Skin profile |
| `rtl/ep_gate.sv` | EP scan |
| `rtl/qai_core.sv` | Core decode |
| `rtl/caduceus_alu.sv` | Braid ALU |
| `rtl/sphinx_hash.sv` | Sphinx fold |
| `gates/G2/rtl/fpga/chipset_top_fpga.sv` | Board wrapper |
| `gates/G2/rtl/fpga/uart_seal_demo.sv` | Host protocol |
| `gates/G2/fpga-constraints.xdc` | Pin + timing |

## Non-project batch flow

```bash
cd gates/G2
vivado -mode batch -source scripts/vivado_build.tcl
```

Or manual:

```tcl
create_project aqai_g2 ./build/aqai_g2 -part xc7a100tcsg324-1 -force
set_property target_language Verilog [current_project]
add_files {../../rtl/chipset_top.sv ../../rtl/seal_ioc.sv ...}
add_files -fileset constrs_1 fpga-constraints.xdc
set_property top chipset_top_fpga [current_fileset]
launch_runs synth_1 -jobs 4
wait_on_run synth_1
launch_runs impl_1 -to_step write_bitstream -jobs 4
wait_on_run impl_1
```

## Simulation (no board required)

```bash
./scripts/fpga-seal-demo.sh
# Writes seal-roundtrip-report.json
```

Uses Verilator if installed; otherwise pure bash reference model matching `seal_ioc` mix64.

## Board bring-up

> **Status:** Blocked until Arty A7 purchased (~$129).

1. Connect USB-JTAG + USB-UART (PROG/UART switch toward UART).
2. Program bitstream: `vivado -mode batch -source scripts/program_arty.tcl`
3. Open serial terminal 115200 8N1 on `/dev/ttyUSB*` or COM port.
4. Send frame: `SEAL COMMIT <lo_hex> <hi_hex>\n` then `SEAL VERIFY <expected_hex>\n`
5. Expect `OK:1` and LED0 (seal_ok) asserted.

## Soft Silicon parity check

Compare FPGA/sim digest to `/chipset` lab:

```javascript
// Browser console on /chipset — Run seal
// Payload lo/hi must match demo vectors in fpga-seal-demo.sh
```

Report cycle latency in `seal-roundtrip-report.json` — target ≤ 20 cycles commit+verify @ 100 MHz.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Timing fail on sphinx_hash | Set `SYNTHESIS=SEAL_ONLY` define to omit sphinx |
| BRAM inference warning | skin_memory profile array — acceptable for N=32 |
| UART garbage | Verify 115200 and PMOD JA pinout |
