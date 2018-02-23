const argv = require("argv");
const babel = require("gulp-babel");
const gulp = require("gulp");
const path = require("path");
const sourcemaps = require("gulp-sourcemaps");
const typescript = require("gulp-typescript");
const uglify = require("gulp-uglify");

const args = argv
    .option({ name: "env", short: "e", type: "string" })
    .run();
const isDebug = args.options["env"] === "debug";
const dest = isDebug ? "./debug" : "./build";
const tsconfig = typescript("tsconfig.json");

gulp.task("compile", () => {
    const src = gulp.src(["src/**/*.ts", "!src/**/*.d.ts"], { base: "./src" });
    if (isDebug) {
        return src.pipe(sourcemaps.init())
            .pipe(tsconfig)
            .pipe(sourcemaps.mapSources((sourcePath, file) => {
                var from = path.dirname(file.path);
                var to = path.resolve(path.join(__dirname, "build"));
                return path.join(path.relative(from, to), sourcePath);
            }))
            .pipe(sourcemaps.write(""))
            .pipe(gulp.dest(dest));
    } else {
        return src.pipe(tsconfig)
            .pipe(babel({
                presets: ["env"]
            }))
            .pipe(uglify())
            .pipe(gulp.dest(dest));
    }
});

gulp.task("build", ["compile"]);
