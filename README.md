## htm-playground

![htm-playground](/screencast.gif "htm-playground")

An experiment sandbox for a rudimentary implementation of [hierarchical temporal memory](https://en.wikipedia.org/wiki/Hierarchical_temporal_memory).

Play with settings, see the HTM improve (or get worse) at recognizing hand-written digits.

### Running

You will want to run:

```npm install```

And:

```browserify client.js -o bundle.js```

NOTE you may need to install browserify globally (or specify the one in node_modules)

Then:

```node server.js```

You can then point your browser to http://localhost:3000 and begin playing with the HTM.
