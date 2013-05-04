module.exports = function(grunt) {
  'use strict';

  // Project configuration.
  grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),
	uglify: {
	    options: {
	      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
	        '<%= grunt.template.today("yyyy-mm-dd") %> */'
	    },
	    js: {
		    options: {
		  	  mangle: true,
          beautify: false,
		  	  compress: true 
		    },
	        files: {
	          'dist/eventPage.js': ['eventPage.js'],
            'dist/content_script.js':['content_script.js']
	        }
	    }
	 },
     copy: {
         main: {
           files: [
             {expand: true, src: ['*.png'], dest: 'dist/', filter: 'isFile'}, 
             {expand: true, src: ['*.css'], dest: 'dist/', filter: 'isFile'}, 
             {expand: false, src: ['font/**'], dest: 'dist/'}, 
             {expand: false, src: ['naivebayes.nodep.min.js'], dest: 'dist/'}, 
             {expand: true, src: ['popup.*'], dest: 'dist/'}, 
             {expand: false, src: ['manifest.json'], dest: 'dist/'}
           ]
         }
}
});
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('default', ['uglify', 'copy']);
};
