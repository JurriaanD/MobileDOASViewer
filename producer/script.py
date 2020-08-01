from time import sleep
import signal
import sys
import os

def signal_handler(sig, frame):
    os.remove("output.dat")
    sys.exit(0)
signal.signal(signal.SIGINT, signal_handler)

lines = open("../viewer/measurements.dat", "r").readlines()

try:
    os.remove("output.dat")
except:
    pass
for line in lines:
    open("output.dat", "a").write(line)
    sleep(5)

os.remove("output.dat")