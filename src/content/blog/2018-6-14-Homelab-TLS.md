---
title: "TLS at Home (and my Plex/Deluge setup!)"
pubDate: "2018-6-14"
author: "Tristan Sweeney"
tags:
  - Network
imgUrl: "../../assets/bg-2.jpg"
description: |
  Last friday / weekend I installed my TLS cert I generated for my router on my
  desktop for services I run off of it.
layout: "../../layouts/BlogPost.astro"
---

Last friday / weekend I installed my TLS cert I generated for my router on my desktop for services I run off of it, FOSWiki via Apache and a Deluge (a torrenting cliente web interface. I also setup Deluge to use an HTTPS proxy and full stream encryption, to ensure anonymity and that my ISP isn't throttling traffic (a lot of legitimate stuff, such as the Arch Linux ISO, are both quite large).

This was as easy as copying the private key and full certificate chain onto my desktop, then pointing the applications to the key files. The main thing I was concerned with was keeping the permissions as strict as possible with these files, so that only applications which absolutely need access to them can read them, and only root could write to them. One would think that I'd just have to set the directory and files as rw-r----- , but for some reason my TLS applications just weren't jiving with that.

After a while, I had the 'duh!' moment. I'd forgotten that `r` gives you permission to list the contents of the directory, but you need the `x` permission to read files within it (or list their owner/permissions). That fixed up the problem and the systemd services stopped crashing on start with permission denied errors. It may have taken me doing a `sudo su deluge ; ls /usr/local/etc/...` to finally diagnose my mistake, but that's a secret I'll be taking to my grave.

To elaborate on my setup, I added a group `certs` that has `rx` permission and added deluge and apache to that group (or I intended to, deluge is a run-as program but apache is run by root). I also created a `media` group, and gave it `rw` permission, adding deluge and plex to it to alow them bot to modify that partition but no-one else (I add content through the deluge web app remotely, which is both amazingly convinent and eliminates having to add my own user account to `media`). Remember though, priacy hurts the companies that produce what you love and you should only torrent content that's been intentionally distributed through that medium intentionally (I've got some funky indie films on there).
