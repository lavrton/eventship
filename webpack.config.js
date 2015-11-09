module.exports = {
    entry: {
        tests: './tests/redux.spec.ts'
    },
    resolve: {
        extensions: ['', '.js', '.ts']
    },
    output: {
        path: __dirname + '/tests/',
        publicPath: '/tests',
        filename: '[name].bundle.js'
    },
    devtool: 'inline-source-map',
    devServer: {
        // noInfo: true, //  --no-info option
        // hot: true
        // inline: true
    },
    module: {
        loaders: [
            {
                exclude: /(node_modules|bower_components)/,
                test: /\.ts$/,
                loader: 'ts-loader'
            }
        ]
    }
};