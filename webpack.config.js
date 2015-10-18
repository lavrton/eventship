module.exports = {
    entry: {
        tests: './tests/redux.spec.js'
    },
    output: {
        path: __dirname + '/tests/',
        publicPath: 'tests',
        filename: '[name].bundle.js'
    },
    devtool: 'source-map',
    devServer: {
        // noInfo: true, //  --no-info option
        // hot: true
        // inline: true
    },
    module: {
        loaders: [
            {
                exclude: /(node_modules|bower_components)/,
                loader: 'babel'
            }
        ]
    }
};