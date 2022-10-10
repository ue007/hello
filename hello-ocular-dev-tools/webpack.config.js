const getWebpackConfig = require('ocular-dev-tools/config/webpack.config');
module.exports = (env) => {
	const config = getWebpackConfig(env);
	// add custom settings
	return config;
};
