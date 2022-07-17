# Linux (ubuntu) on the Yoga  3 Pro

I love my Yoga 3 Pro, but a lot of its functionality has never *just
worked* on linux. Here's my notes for whenever I have to reinstall the
machine.

## Power management/profiles (i.e. terrible performance!)

Lenovo basically abandoned these laptops after windows 10 came about
(and never supported linux). They used to have a Energy Management
tool on Windows 8.1 that would let you set the performance policy,
they replaced this with a ACPI driver for Win10. Unfortunately, this
new ACPI driver locks the system on a "balanced" energy profile which
heavily throttles the CPU/GPU package under load. For example, you
start a video then your laptop will stutter under load after around
30s just moving the mouse. The issue is the balanced profile limits
the average power-draw of the package, thus this isn't even a
temperature issue but some brain-dead "energy saving" measure.

Amazingly, Linux has the tools to fix this and windows 10 does
not. You need to install some tools:
	
	sudo apt install linux-tools-generic linux-oem-5.6-tools-common
	
If you run the tool, you should be informed you're on the "balance"
profile:

	sudo x86_energy_perf_policy 
	cpu0: EPB 6
	cpu1: EPB 6
	cpu2: EPB 6
	cpu3: EPB 6

The 6 means balanced. You then need to set the Energy Performance Bias
(EPB) to balance-performance or performance.

	sudo x86_energy_perf_policy --epb balance-performance
	
Running the tool again gives you a 4 and a useful laptop once again!

	sudo x86_energy_perf_policy 
	cpu0: EPB 4
	cpu1: EPB 4
	cpu2: EPB 4
	cpu3: EPB 4

Battery life is nearly unaffected and the system remains responsive
under heavy load. To make these settings permanent, install a tool
like TLP to manage this.

	sudo add-apt-repository ppa:linrunner/tlp
	sudo apt update
	sudo apt install tlp tlp-rdw

Then edit the configuration in ```/etc/tlp.conf``` and uncomment (and
change) the lines.
	
	CPU_ENERGY_PERF_POLICY_ON_AC=balance_performance
	CPU_ENERGY_PERF_POLICY_ON_BAT=balance_performance

Really, you do not want anything less than balance_performance. I also
set p states to allow max on battery and a few others, but this is to
your taste rather than essential.

## GRUB/terminal text size (and rendering speed)

While I don't mind the extremely small font, the console actually
renders slowly due to the enormous screen resolution. Following advice
from here
https://www.ctrl.blog/entry/how-to-lenovo-yoga3-pro-linux.html, I
modified ```/etc/default/grub``` to have
```GRUB_GFXMODE=1280x1024```. This sorts out grub. Once modesetting
takes over its nice to just bump the font size up a little to make
working without X more pleasant. I also modified
```/etc/default/console-setup``` to have ```FONTSIZE=16x32``` and
```FONTFACE="Terminus"```.


## Suspend/resume

All works now with 20.04. Only issue seems to be with the touchpad
being alternately disabled/enabled on suspend resume. I'm guessing the
touchpad enable key is incorrectly bound but I've not dug to figure
that out. This is a real problem as the actual tocuhpad enable key is
non-functional too, so lets fix that.

## Special keys 

We need to bind the key, dmesg show's that this key is currently
unmapped. Create a file at
```/etc/udev/hwdb.d/90-custom-keyboard.hwdb``` with the following content:

    evdev:atkbd:dmi:bvn*:bvr*:bd*:svn*:pn*:pvr*
     KEYBOARD_KEY_0xbe=f21 #Re-enable touchpad!!

Be warned though, this may match against external keyboards

## Automatic screen rotation and backlight brightness

I'm on Kubuntu, which seems to miss automatic brightness controls in
the Power control panel (like Ubuntu/Gnome supposedly has) as well as
automatic screen rotation. To fix this I wrote the script below and
placed it at ```/usr/bin/auto_backlight_screen_rotation.sh```.

    #!/bin/sh
    # Auto rotate screen based on device orientation
    
    # Receives input from monitor-sensor (part of iio-sensor-proxy package)
    # Screen orientation and launcher location is set based upon accelerometer position
    # Launcher will be on the left in a landscape orientation and on the bottom in a portrait orientation
    # This script should be added to startup applications for the user
    
    # Clear sensor.log so it doesn't get too long over restarts
    > sensor.log
    
    # Launch monitor-sensor and store the output in a variable that can be parsed by the rest of the script
    monitor-sensor >> sensor.log 2>&1 &
    
    MAXBL=$(cat /sys/class/backlight/intel_backlight/max_brightness)
    
    # Parse output or monitor sensor to get the new orientation whenever the log file is updated
    # Possibles are: normal, bottom-up, right-up, left-up
    # Light data will be ignored
    while inotifywait -e modify sensor.log; do
    # Read the last line that was added to the file and get the orientation
    ORIENTATION=$(tail -n 1 sensor.log | grep 'orientation' | grep -oE '[^ ]+$')
    LUX=$(tail -n 1 sensor.log | grep 'Light changed' | gawk '{print $3}')
    echo "Orientation " $ORIENTATION " LUX " $LUX
    
    #IFF there's a lux value change, then compute the brightness
    echo "PONG"
    if [ ! -z $LUX ]; then
        MinBackLight=0.2 # Minimum fraction of backlight power
        DeltaBackLight=0.8 # Maximum fraction of backlight power
        LowLUX=100
        HighLUX=1000
    
        #Just linearly scale the range LowLUX->HighLUX onto the range of backlight percentages above
        BL=$(echo "print(int(($MinBackLight+$DeltaBackLight*min(1.0,max(0,($LUX-$LowLUX)/($HighLUX-$LowLUX))))*$MAXBL))" | python3)
        
        echo $BL > /sys/class/backlight/intel_backlight/brightness
    fi
    
    TOUCHSCREEN="ATML1000:00 03EB:8A10"
    TRANSFORM="Coordinate Transformation Matrix"
    
    # Set the actions to be taken for each possible orientation (IFF an orientation change was detected)
    
    # If you are using Ubuntu you might want to adjust the launcher position, e.g.
    #&& gsettings set com.canonical.Unity.Launcher launcher-position Left
    #&& gsettings set com.canonical.Unity.Launcher launcher-position Bottom
    
    echo "PING"
    case "$ORIENTATION" in
    normal)
    xrandr --output eDP-1 --rotate normal && xinput set-prop "$TOUCHSCREEN" "$TRANSFORM" 1 0 0 0 1 0 0 0 1 ;;
    bottom-up)
    xrandr --output eDP-1 --rotate inverted && xinput set-prop "$TOUCHSCREEN" "$TRANSFORM" -1 0 1 0 -1 1 0 0 1 ;;
    right-up)
    xrandr --output eDP-1 --rotate right && xinput set-prop "$TOUCHSCREEN" "$TRANSFORM" 0 1 0 -1 0 1 0 0 1 ;;
    left-up)
    xrandr --output eDP-1 --rotate left && xinput set-prop "$TOUCHSCREEN" "$TRANSFORM" 0 -1 1 1 0 0 0 0 1 ;;
    esac
    done

If you want to get this script to run as a normal user (rather than
root), you need to modify the systemd script and also allow a
particular group to access the backlight controls. Putting the
following script into ```/etc/udev/rules.d/backlight.rules``` allows
users in the plugdev group to do just that.

    ACTION=="add", SUBSYSTEM=="backlight", KERNEL=="intel_backlight", RUN+="/bin/chgrp plugdev /sys/class/backlight/%k/brightness"
	ACTION=="add", SUBSYSTEM=="backlight", KERNEL=="intel_backlight", RUN+="/bin/chmod g+w /sys/class/backlight/%k/brightness"

I then add this to my X startup using the Autostart tool in the
menu. I've tried to get this for the login screen but getting the
Xsession variable set up right was too much. I just run the script
whenever I want rotation.

The LUX sensor seems to be particular about when it decides to report
the light levels. The device is somewhere under this
```/sys/bus/iio/devices/iio:deviceX``` where X changes value from boot
to boot. Usually in the range 0-4. There's two issues that might be
stopping the sensor. First, its buffer might not be enabled, i.e. for X=2
```/sys/bus/iio/devices/iio:device2/buffer/enable```. If you can't set
this to 1, then check that an appropriate trigger has been set. In
this system,
```/sys/bus/iio/devices/iio:device2/trigger/current_trigger``` should
be set to ```als-dev2`` (again assuming if X is 2).

# Enable GPU acceleration

Its not the beefiest CPU by any stretch, so GPU acceleration is a must
especially for modern web which has tons of rasterisation etc. Force
enable GPU acceleration in Chrome, install and check video is
accelerated using ```vainfo``` and install ```libva-glx2``` or
```libva-x11-2``` (maybe).

If vainfo shows everything working, enable GPU acceleration in Chrome by ignoring the blacklist, enabling hardware acceleration, and then run chrome like this:

``` /usr/bin/google-chrome-stable --ignore-gpu-blocklist --disable-features=UseChromeOSDirectVideoDecoder --use-gl=desktop --enable-features=VaapiVideoDecoder %U```

Then check ```chrome://gpu``` to see that decode is enabled. Might need to install the hx254ify browser extension.

# USB ethernet adapter support

I use a cheap USB3.0 RTL 8153 GbE adapter to give me wired internet
access. This tends to crash out network manager and prevent restart
holding up the TLP process. To fix this we disable autosuspend on usb
for the device using a udev rule. Make a file
```/etc/udev/rules.d/usbethernet.rules``` and put the following in it

	ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="0bda", ATTR{idProduct}=="8153", TEST=="power/control", ATTR{power/control}="on"
