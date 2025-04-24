import ace from 'ace-builds'
import themeChromeUrl from 'ace-builds/src-noconflict/theme-chrome?url'
import modeJsonUrl from 'ace-builds/src-noconflict/mode-json?url'
import modeXmlUrl from 'ace-builds/src-noconflict/mode-xml?url'
import modeTextUrl from 'ace-builds/src-noconflict/mode-text?url'
import 'ace-builds/src-noconflict/ext-language_tools'

ace.config.setModuleUrl('ace/theme/chrome', themeChromeUrl)

ace.config.setModuleUrl('ace/mode/json', modeJsonUrl)

ace.config.setModuleUrl('ace/mode/xml', modeXmlUrl)

ace.config.setModuleUrl('ace/mode/text', modeTextUrl)

ace.require('ace/ext/language_tools')
