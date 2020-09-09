from time import sleep
import signal
import sys
import os

# This script will read input_file and write it line-by-line to output_file
input_file_path = "datasets/measurements-short.dat"
output_file_path = "datasets/simulated.dat"

lines = open(input_file_path, "r").readlines()

try:
    os.remove(output_file_path)
    sleep(5)
except FileNotFoundError as _e:
    pass

# Write a new measurement to the data file every 5 seconds
for line in lines:
    open(output_file_path, "a").write(line)
    sleep(5)