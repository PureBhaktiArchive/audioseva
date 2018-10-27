

//Loading the Functions from their modules
const glob = require('glob');
const functionFiles = glob.sync('./src/*.functions.js', { cwd: __dirname });

functionFiles.forEach((file, index) => {
    const filename = file.split('/').pop().slice(0, -13); // remove the trailing ".functions.js"
    exports[filename] = require(file);
});

