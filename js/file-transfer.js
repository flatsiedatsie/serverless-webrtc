/*  MIT License: https://webrtc-experiment.appspot.com/licence/
 *	2013, Muaz Khan<muazkh>--[ github.com/muaz-khan ]
 */
/* For documentation and examples: http://bit.ly/RTCDataConnection */


var FileSender = {
    send: function (config) {
        var channel = config.channel,
            file = config.file;

        /* if firefox nightly: share file blob directly */
        if (moz) {
            /* used on the receiver side to set received file name */
            channel.send({
                fileName: file.name,
                type: 'file'
            });

            /* sending entire file at once */
            channel.send({
                file: file
            });

            if (config.onFileSent) config.onFileSent(file);
        }

        /* if chrome */
        if (!moz) {
            var reader = new window.FileReader();
            reader.readAsDataURL(file);
            reader.onload = onReadAsDataURL;
        }

        var packetSize = 1000,
            textToTransfer = '',
            packets = 0;

        function onReadAsDataURL(event, text) {
            var data = {
                type: 'file'
            };

            if (event) {
                text = event.target.result;
                packets = data.packets = parseInt(text.length / packetSize);
            }

            if (config.getFileStats) config.getFileStats({
                    items: packets--,
                    file: file
                });

            if (text.length > packetSize) data.message = text.slice(0, packetSize);
            else {
                data.message = text;
                data.last = true;
                data.name = file.name;

                if (config.onFileSent) config.onFileSent(file);
            }

            channel.send(data);

            textToTransfer = text.slice(data.message.length);

            if (textToTransfer.length)
                setTimeout(function () {
                    onReadAsDataURL(null, textToTransfer);
                }, 500);
        }
    }
};

function FileReceiver() {
    var content = [],
        fileName = '',
        packets = 0;

    function receive(data, config) {
        /* if firefox nightly & file blob shared */
        if (moz) {
            if (data.fileName) fileName = data.fileName;
            if (data.size) {
                var reader = new window.FileReader();
                reader.readAsDataURL(data);
                reader.onload = function (event) {
                    FileSaver.SaveToDisk(event.target.result, fileName);
                    if (config.onFileReceived) config.onFileReceived(fileName);
                };
            }
        }

        if (!moz) {
            if (data.packets) packets = parseInt(data.packets);

            if (config.getFileStats) config.getFileStats({
                    items: packets--
                });

            content.push(data.message);

            if (data.last) {
                FileSaver.SaveToDisk(content.join(''), data.name);
                if (config.onFileReceived) config.onFileReceived(data.name);
                content = [];
            }
        }
    }

    return {
        receive: receive
    };
}

var FileSaver = {
    SaveToDisk: function (fileUrl, fileName) {
        var save = document.createElement("a");
        save.href = fileUrl;
        save.target = "_blank";
        save.download = fileName || fileUrl;

        var evt = document.createEvent('MouseEvents');
        evt.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);

        save.dispatchEvent(evt);

        (window.URL || window.webkitURL).revokeObjectURL(save.href);
    }
};
