const { withDangerousMod, withAppBuildGradle } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");
module.exports = function withOfflineRelease(config) {
  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const directory = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "release",
      );
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(
        path.join(directory, "AndroidManifest.xml"),
        `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"><uses-permission android:name="android.permission.INTERNET" tools:node="remove" /></manifest>\n`,
      );
      return config;
    },
  ]);
  return withAppBuildGradle(config, (config) => {
    const marker = "// BUG DEV external release signing";
    if (!config.modResults.contents.includes(marker))
      config.modResults.contents += `\n${marker}
def jaguarBuildHome = System.getProperty('user.home')
android.defaultConfig.externalNativeBuild.cmake {
    cppFlags "-ffile-prefix-map=\${jaguarBuildHome}=/build-host"
    cFlags "-ffile-prefix-map=\${jaguarBuildHome}=/build-host"
}
def jaguarSigningPath = System.getenv('BUGDEV_SIGNING_FILE')
if (jaguarSigningPath) {
    def jaguarProperties = new Properties()
    new File(jaguarSigningPath).withInputStream { jaguarProperties.load(it) }
    android.signingConfigs.create('jaguarRelease') {
        storeFile file(jaguarProperties.getProperty('storeFile'))
        storePassword jaguarProperties.getProperty('storePassword')
        keyAlias jaguarProperties.getProperty('keyAlias')
        keyPassword jaguarProperties.getProperty('keyPassword')
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.jaguarRelease
}
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name.toLowerCase().contains('release') } && !jaguarSigningPath) {
        throw new GradleException('Set BUGDEV_SIGNING_FILE to an external private signing properties file before creating a release.')
    }
}
`;
    return config;
  });
};
