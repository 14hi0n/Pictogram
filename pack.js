const { readFileSync, existsSync, mkdirSync } = require('fs');
const { resolve } = require('path');
const AdmZip = require('adm-zip');

try {
  const { name } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));
  const { version, version_name } = JSON.parse(
    readFileSync(resolve(__dirname, 'build', 'manifest.json'), 'utf8')
  );

  const outdir = 'release';
  const filename = `${name}-v${version_name || version}.zip`;
  const zip = new AdmZip();
  zip.addLocalFolder('build');
  if (!existsSync(outdir)) {
    mkdirSync(outdir);
  }
  zip.writeZip(`${outdir}/${filename}`);

  process.stdout.write(
    `Success! Created ${filename} under ${outdir}/. You can upload this file to the web store.\n`
  );
} catch (e) {
  console.error('Error! Failed to generate a zip file.', e);
  process.exit(1);
}
