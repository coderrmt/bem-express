const fs = require('fs');
const bemConfig = require('@bem/sdk.config')();
const techs = {
    fileProvider: require('enb/techs/file-provider'),
    fileMerge: require('enb/techs/file-merge'),
    fileCopy: require('enb/techs/file-copy'),
    borschik: require('enb-borschik/techs/borschik'),
    postcss: require('enb-postcss/techs/enb-postcss'),
    postcssPlugins: [
        require('postcss-import')(),
        require('postcss-each'),
        require('postcss-for'),
        require('postcss-simple-vars')(),
        require('postcss-calc')(),
        require('postcss-nested'),
        require('rebem-css'),
        require('postcss-url')({ url: 'inline' }),
        require('autoprefixer')()
    ],
    browserJs: require('enb-js/techs/browser-js'),
    bemtree: require('enb-bemxjst/techs/bemtree'),
    bemhtml: require('enb-bemxjst/techs/bemhtml')
};
const enbBemTechs = require('enb-bem-techs');
const isProd = process.env.YENV === 'production';

function getLevelsByPlatform(platform) {
    const levels = bemConfig.levelsSync(platform)
        .filter(level => fs.existsSync(level.path))
        .map(level => ({ check: false }, level));

    isProd || levels.push('development.blocks');

    return levels;
}

module.exports = function(config) {
    config.nodes('*.bundles/*', function(nodeConfig) {
        const platform = nodeConfig.getPath().split('.')[0];

        nodeConfig.addTechs([
            // essential
            [enbBemTechs.levels, { levels: getLevelsByPlatform(platform) }],
            [techs.fileProvider, { target: '?.bemdecl.js' }],
            [enbBemTechs.deps],
            [enbBemTechs.files],

            // css
            [techs.postcss, {
                target: '?.css',
                oneOfSourceSuffixes: ['post.css', 'css'],
                plugins: techs.postcssPlugins
            }],

            // bemtree
            [techs.bemtree, { sourceSuffixes: ['bemtree', 'bemtree.js'] }],

            // templates
            [techs.bemhtml, {
                sourceSuffixes: ['bemhtml', 'bemhtml.js'],
                forceBaseTemplates: true,
                engineOptions: { elemJsInstances: true }
            }],

            // client templates
            [enbBemTechs.depsByTechToBemdecl, {
                target: '?.tmpl.bemdecl.js',
                sourceTech: 'js',
                destTech: 'bemhtml'
            }],
            [enbBemTechs.deps, {
                target: '?.tmpl.deps.js',
                bemdeclFile: '?.tmpl.bemdecl.js'
            }],
            [enbBemTechs.files, {
                depsFile: '?.tmpl.deps.js',
                filesTarget: '?.tmpl.files',
                dirsTarget: '?.tmpl.dirs'
            }],
            [techs.bemhtml, {
                target: '?.browser.bemhtml.js',
                filesTarget: '?.tmpl.files',
                sourceSuffixes: ['bemhtml', 'bemhtml.js'],
                engineOptions: { elemJsInstances: true }
            }],

            // js
            [techs.browserJs, { includeYM: true }],
            [techs.fileMerge, {
                target: '?.js',
                sources: ['?.browser.js', '?.browser.bemhtml.js']
            }],

            // borschik
            [techs.borschik, { source: '?.js', target: '?.min.js', minify: isProd }],
            [techs.borschik, { source: '?.css', target: '?.min.css', minify: isProd }],

            [techs.fileCopy, { source: '?.min.js', target: '../../static/?.' + platform + '.min.js' }],
            [techs.fileCopy, { source: '?.min.css', target: '../../static/?.' + platform + '.min.css' }]
        ]);

        nodeConfig.addTargets([
            '?.bemtree.js',
            '?.bemhtml.js',
            '../../static/?.' + platform + '.min.js',
            '../../static/?.' + platform + '.min.css'
        ]);
    });
};
