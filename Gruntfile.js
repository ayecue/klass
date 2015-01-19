module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        amdwrap: {
            src: {
                expand: true,
                cwd: 'src',
                src: ['**/*.js'],
                dest: 'amd'
            }
        },

        browserify: {
            test: {
                files: {
                    'test_bundle.js': ['test-built/**/*.js']
                },
                options: {
                    transform: ['envify'],
                    verbose: true
                }
            }
        },

        requirejs: {
            dev: {
                options: {
                    baseUrl: "amd",
                    name: "../tools/vendor/almond",
                    out: "amd/klass.js",
                    wrap: {
                        startFile: "tools/wrap.start",
                        endFile: "tools/wrap.end"
                    },
                    include: ["klass"],
                    optimize: "none"
                }
            }
        },

        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'amd/<%= pkg.name %>.js',
                dest: 'amd/<%= pkg.name %>.min.js'
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-amd-wrap');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-requirejs');

    grunt.registerTask('build', [
        'amdwrap',
        'browserify:test',
        'requirejs:dev',
        'uglify:build'
    ]);

    grunt.registerTask('default', ['build']);
};
