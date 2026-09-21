# G2 — Vivado constraints (Digilent Arty A7-100T)
# AQAI seal demo subset — 100 MHz sys clock

# Clock
create_clock -period 10.000 -name sys_clk [get_ports sys_clk]
set_property CLOCK_DEDICATED_ROUTE FALSE [get_nets sys_clk_IBUF]

# Arty A7 100 MHz clock (E3)
set_property PACKAGE_PIN E3 [get_ports sys_clk]
set_property IOSTANDARD LVCMOS33 [get_ports sys_clk]

# Reset button BTNC (C12) — active low
set_property PACKAGE_PIN C12 [get_ports rst_n]
set_property IOSTANDARD LVCMOS33 [get_ports rst_n]

# Status LEDs — seal_ok, at_ep, pt_broken, halt
set_property PACKAGE_PIN H5 [get_ports {led[0]}]
set_property PACKAGE_PIN J5 [get_ports {led[1]}]
set_property PACKAGE_PIN T9 [get_ports {led[2]}]
set_property PACKAGE_PIN T10 [get_ports {led[3]}]
set_property IOSTANDARD LVCMOS33 [get_ports {led[*]}]

# PMOD JA — UART seal demo (115200 8N1)
# JA1 = tx, JA2 = rx
set_property PACKAGE_PIN G13 [get_ports uart_tx]
set_property PACKAGE_PIN B11 [get_ports uart_rx]
set_property IOSTANDARD LVCMOS33 [get_ports uart_tx]
set_property IOSTANDARD LVCMOS33 [get_ports uart_rx]

# False paths — async reset
set_false_path -from [get_ports rst_n]

# Seal path multicycle (commit → verify)
set_multicycle_path -setup 2 -from [get_cells -hier -filter {NAME =~ *u_seal*}] -to [get_cells -hier -filter {NAME =~ *u_seal*}]
set_multicycle_path -hold 1 -from [get_cells -hier -filter {NAME =~ *u_seal*}] -to [get_cells -hier -filter {NAME =~ *u_seal*}]

# Timing budget target: seal commit+verify < 200 ns @ 100 MHz (20 cycles documented in sim)
