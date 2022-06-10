var gulp = require("gulp");
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

gulp.task("copy-html", function () {
    return gulp.src(["public/*.html"]).pipe(gulp.dest("dist"));
});

gulp.task("compile-ts", function () {
    return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("dist"));
});

gulp.task(
    "default",
    gulp.parallel("copy-html", "compile-ts")
);
