#!/bin/bash

# You need to global.context.unsafe_mode = true in looking glass

old=$(gnome-extensions list | grep -e '-switcher@landau.fi')

d=$RANDOM-switcher@landau.fi
sed -i'.bak' -e "s/switcher@landau.fi/$d/" metadata.json
sed -i'.bak' -e "s/switcher@landau.fi/$d/" prefs.js
sed -i'.bak' -e "s/switcher@landau.fi/$d/" convenience.js
./build.sh
zip=$(readlink -f switcher.zip)
mv metadata.json.bak metadata.json
mv prefs.js.bak prefs.js
mv convenience.js.bak convenience.js

gnome-extensions install $zip
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s "Main.extensionManager.loadExtension(Main.extensionManager.createExtensionObject('$d', Gio.File.new_for_path('/home/dlandau/.local/share/gnome-shell/extensions/$d' ), 2))"
if [[ -n $old ]]
then
  gnome-extensions disable $old
  gnome-extensions uninstall $old
fi
gnome-extensions enable $d


