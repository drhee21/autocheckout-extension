document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addressForm');
    const status = document.getElementById('status');

    // Load saved data
    chrome.storage.local.get([
        'address1', 'address2', 'city', 'state', 'country', 'postal', 'email', 'phone'
    ], function(data) {
        if (data.address1) form.address1.value = data.address1;
        if (data.address2) form.address2.value = data.address2;
        if (data.city) form.city.value = data.city;
        if (data.state) form.state.value = data.state;
        if (data.country) form.country.value = data.country;
        if (data.postal) form.postal.value = data.postal;
        if (data.email) form.email.value = data.email;
        if (data.phone) form.phone.value = data.phone;
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const info = {
            address1: form.address1.value,
            address2: form.address2.value,
            city: form.city.value,
            state: form.state.value,
            country: form.country.value,
            postal: form.postal.value,
            email: form.email.value,
            phone: form.phone.value
        };
        chrome.storage.local.set(info, function() {
            status.textContent = 'Saved!';
            setTimeout(() => status.textContent = '', 1500);
        });
    });
});
