#!/bin/bash

zip -r switcher.zip $(find . -name running.gif -prune -or -name G\* -prune -or -name '*.bak' -prune -or -name '.?*' -prune -or -path '*/.?*' -prune -or -print | grep -v '^[.]$')
