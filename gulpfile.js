const gulp = require("gulp");
const terser = require("gulp-terser");
const ts = require("gulp-typescript");
const babel = require("gulp-babel");
const tsProject = ts.createProject("tsconfig.json");

function typescript() {
  return tsProject
    .src()
    .pipe(tsProject())
    .js.pipe(babel())
    .pipe(terser({ compress: true, mangle: true }))
    .pipe(gulp.dest("lib"));
}

function copyRest() {
  return gulp
    .src(["src/**/*", "!src/**/*.ts", "src/**/*.d.ts"])
    .pipe(gulp.dest("lib"));
}

const build = gulp.series(typescript, copyRest);

exports.default = build;
