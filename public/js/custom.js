        var infoImage = document.getElementById('information');
        var contactUs = document.getElementById('contact-us');
        var view = document.getElementById('view-change-button');
        var input = document.getElementById('textInput');
        var payloadColumn = document.getElementById('payload-column');
        var thumbUp = document.getElementById('thumb-up');
        var thumbDown = document.getElementById('thumb-down');
        var feedback = document.getElementsByClassName('feedback')[0];


        infoImage.onclick = function() {
        	document.getElementById('textInput').value = 'about prometheus';
        	var ev = document.createEvent('Event');
        	ev.initEvent('keypress', true, true);
        	ev.which = ev.keyCode = 13;
        	input.dispatchEvent(ev);
        	ConversationPanel.inputKeyDown(ev, input);
        };
        contactUs.onclick = function() {
        	document.getElementById('textInput').value = 'how do i contact you?';
        	var ev = document.createEvent('Event');
        	ev.initEvent('keypress', true, true);
        	ev.which = ev.keyCode = 13;
        	input.dispatchEvent(ev);
        	ConversationPanel.inputKeyDown(ev, input);
        };
        
        function feedBack(feedback_div) {
        	feedback_div.innerHTML = '<p style="color: aqua;">Thank You for the feedback!</p>';
        };