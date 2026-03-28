const qrcode = require('qrcode-terminal')

function printQR(url) {
  console.log('\n' + '='.repeat(52))
  console.log('  Voice Clone Server ready!')
  console.log('  Scan with your Android phone:')
  console.log('='.repeat(52) + '\n')
  qrcode.generate(url, { small: true })
  console.log('\n  ' + url + '\n')
  console.log('='.repeat(52) + '\n')
}

module.exports = { printQR }
