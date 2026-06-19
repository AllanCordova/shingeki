/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const easCliRoot = 'C:/Users/allan/AppData/Roaming/npm/node_modules/eas-cli';

async function main() {
  const SessionManager = require(path.join(easCliRoot, 'build/user/SessionManager')).default;
  const { createGraphqlClient } = require(path.join(
    easCliRoot,
    'build/commandUtils/context/contextUtils/createGraphqlClient'
  ));
  const { UserQuery } = require(path.join(easCliRoot, 'build/graphql/queries/UserQuery'));
  const { CredentialsContext } = require(path.join(easCliRoot, 'build/credentials/context'));
  const { getAppLookupParamsFromContextAsync } = require(path.join(
    easCliRoot,
    'build/credentials/android/actions/BuildCredentialsUtils'
  ));
  const { updateAndroidCredentialsAsync } = require(path.join(
    easCliRoot,
    'build/credentials/credentialsJson/update'
  ));
  const { createAnalyticsAsync } = require(path.join(easCliRoot, 'build/analytics/AnalyticsManager'));
  const NoVcsClient = require(path.join(easCliRoot, 'build/vcs/clients/noVcs')).default;

  const analytics = await createAnalyticsAsync();
  const sessionManager = new SessionManager(analytics);
  const sessionSecret = sessionManager.getSessionSecret();
  const accessToken = sessionManager.getAccessToken();

  if (!sessionSecret && !accessToken) {
    throw new Error('Faça login no EAS com: eas login');
  }

  const graphqlClient = createGraphqlClient({ accessToken, sessionSecret });
  const actor = await UserQuery.currentUserAsync(graphqlClient);
  if (!actor) {
    throw new Error('Sessão EAS inválida. Rode: eas login');
  }

  const appJson = JSON.parse(fs.readFileSync(path.join(projectDir, 'app.json'), 'utf8'));
  const projectId = appJson.expo.extra.eas.projectId;

  const ctx = new CredentialsContext({
    projectDir,
    projectInfo: { exp: appJson.expo, projectId },
    user: actor,
    graphqlClient,
    analytics,
    vcsClient: new NoVcsClient(projectDir),
    nonInteractive: true,
  });

  const appLookupParams = await getAppLookupParamsFromContextAsync(ctx, null);
  const buildCredentials = await ctx.android.getDefaultAndroidAppBuildCredentialsAsync(
    graphqlClient,
    appLookupParams
  );

  if (!buildCredentials?.androidKeystore) {
    throw new Error('Nenhum keystore Android encontrado no EAS para este projeto.');
  }

  const credsDir = path.join(projectDir, 'credentials');
  const keystorePath = path.join(credsDir, 'android', 'keystore.jks');
  fs.mkdirSync(path.dirname(keystorePath), { recursive: true });

  await updateAndroidCredentialsAsync(ctx, buildCredentials);

  const credentials = JSON.parse(fs.readFileSync(path.join(projectDir, 'credentials.json'), 'utf8'));
  const { keystorePassword, keyAlias, keyPassword } = credentials.android.keystore;

  const bundlePath = path.join(projectDir, 'shingekiApp.aab');
  const apksPath = path.join(projectDir, 'meu_app.apks');
  const apkOutputDir = path.join(projectDir, 'apk-output');
  const bundletoolJar = path.join(__dirname, 'bundletool-all.jar');

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`AAB não encontrado: ${bundlePath}`);
  }
  if (!fs.existsSync(bundletoolJar)) {
    throw new Error(`bundletool não encontrado: ${bundletoolJar}`);
  }

  if (fs.existsSync(apksPath)) {
    fs.unlinkSync(apksPath);
  }

  console.log('Gerando APKS assinado...');
  execSync(
    [
      'java -jar',
      `"${bundletoolJar}"`,
      'build-apks',
      `--bundle="${bundlePath}"`,
      `--output="${apksPath}"`,
      '--mode=universal',
      `--ks="${path.join(projectDir, credentials.android.keystore.keystorePath)}"`,
      `--ks-key-alias="${keyAlias}"`,
      `--ks-pass=pass:${keystorePassword}`,
      `--key-pass=pass:${keyPassword ?? keystorePassword}`,
    ].join(' '),
    { stdio: 'inherit', cwd: projectDir }
  );

  fs.mkdirSync(apkOutputDir, { recursive: true });
  console.log('Extraindo APK universal...');

  const { execFileSync } = require('child_process');
  execFileSync(
    'tar',
    ['-xf', apksPath, '-C', apkOutputDir, 'universal.apk'],
    { stdio: 'inherit', cwd: projectDir }
  );

  const universalApk = path.join(apkOutputDir, 'universal.apk');
  const finalApk = path.join(projectDir, 'shingekiApp-universal.apk');
  fs.copyFileSync(universalApk, finalApk);
  console.log('\nPronto!');
  console.log(`Keystore: ${credentials.android.keystore.keystorePath}`);
  console.log(`APKS: ${apksPath}`);
  console.log(`APK: ${finalApk}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
