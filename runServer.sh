#! /bin/sh
(trap 'kill 0' SIGINT; cd map; npm start & cd ../viewer; npm start)