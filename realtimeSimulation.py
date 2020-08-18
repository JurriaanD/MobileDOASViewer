from time import sleep
import signal
import sys
import os

input_file = "viewer/measurements.dat"
output_file = "simultation.dat"

lines = open(input_file, "r").readlines()

# Remove output from previous simulation
os.remove(output_file)

# Write a new measurement to the data file every 5 seconds
for line in lines:
    open(output_file, "a").write(line)
    sleep(5)