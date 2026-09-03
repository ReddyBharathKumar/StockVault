'use strict';

document.addEventListener('DOMContentLoaded', () => {
    
    /* ==========================================================================
       1. SHARED PAGE SHELL (Mobile Sidebar Toggle)
       ========================================================================== */
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const toggle = document.getElementById('sidebarToggle');

    if (sidebar && backdrop && toggle) {
        function setSidebarOpen(isOpen) {
            sidebar.classList.toggle('is-open', isOpen);
            backdrop.classList.toggle('is-open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        }

        toggle.addEventListener('click', () => {
            setSidebarOpen(!sidebar.classList.contains('is-open'));
        });
        backdrop.addEventListener('click', () => setSidebarOpen(false));
    }

    /* ==========================================================================
       2. TAB SWITCHING LOGIC
       ========================================================================== */
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Ignore if already active
            if (button.classList.contains('is-active')) return;

            // Find the parent container of the tabs
            const tabsContainer = button.closest('.sub-nav-tabs');
            
            // Remove 'is-active' from all buttons in this row
            tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('is-active'));
            
            // Add 'is-active' to the clicked button
            button.classList.add('is-active');

            // Switch the content panels
            const targetId = button.getAttribute('data-target');
            if (targetId) {
                // Hide all panels
                document.querySelectorAll('.tab-content').forEach(panel => panel.classList.remove('is-active'));
                // Show target panel
                document.getElementById(targetId).classList.add('is-active');
            }
        });
    });

    /* ==========================================================================
       3. DROPDOWN MENUS (Notifications & Profile)
       ========================================================================== */
    const notifBtn = document.getElementById('notifBtn');
    const notifMenu = document.getElementById('notifMenu');
    
    const userBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');

    // Toggle Notifications
    if (notifBtn && notifMenu) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents click from instantly closing it
            notifMenu.classList.toggle('show');
            if(userMenu) userMenu.classList.remove('show');
        });
    }

    // Toggle User Profile
    if (userBtn && userMenu) {
        userBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            if(notifMenu) notifMenu.classList.remove('show');
        });
    }

    // Click anywhere else on the screen to close dropdowns
    document.addEventListener('click', () => {
        if (notifMenu) notifMenu.classList.remove('show');
        if (userMenu) userMenu.classList.remove('show');
    });

    /* ==========================================================================
       4. SUPPORT TICKET MODAL LOGIC
       ========================================================================== */
    const supportModal = document.getElementById('supportModal');
    const openSupportBtn = document.getElementById('openSupportBtn');
    const closeSupportBtn = document.getElementById('closeSupportBtn');
    const cancelSupportBtn = document.getElementById('cancelSupportBtn');

    if (openSupportBtn && supportModal) {
        openSupportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            supportModal.classList.add('active');
        });
    }

    if (closeSupportBtn) {
        closeSupportBtn.addEventListener('click', () => supportModal.classList.remove('active'));
    }

    if (cancelSupportBtn) {
        cancelSupportBtn.addEventListener('click', () => supportModal.classList.remove('active'));
    }

    // LOGOUT LOGIC
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_name');
        window.location.href = 'index.html';
    });

    /* ==========================================================================
           5. PROFILE AVATAR LOGIC (Account Page)
           ========================================================================== */
        const changeAvatarBtn = document.getElementById('changeAvatarBtn');
        const removeAvatarBtn = document.getElementById('removeAvatarBtn');
        const avatarUpload = document.getElementById('avatarUpload');
        const mainAvatarIcon = document.getElementById('mainAvatarIcon');
        const saveProfileBtn = document.getElementById('saveProfileBtn'); // The new save button

        // 1. Trigger the file browser when "Change Avatar" is clicked
        if (changeAvatarBtn && avatarUpload) {
            changeAvatarBtn.addEventListener('click', () => {
                avatarUpload.click(); 
            });

            // 2. Visually update the image when a file is selected!
            avatarUpload.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    
                    // Create a temporary visual preview of the image
                    const imageUrl = URL.createObjectURL(file);
                    
                    // Inject the image into the background of our circle
                    mainAvatarIcon.style.backgroundImage = `url(${imageUrl})`;
                    mainAvatarIcon.style.backgroundSize = 'cover';
                    mainAvatarIcon.style.backgroundPosition = 'center';
                    
                    // Remove the "RB" text so it doesn't sit on top of the face
                    mainAvatarIcon.innerHTML = ''; 
                    
                    alert(`Preview generated! When connected to Java, "${file.name}" will be uploaded to the database.`);
                }
            });
        }

        // 3. Clear the avatar when "Remove" is clicked
        if (removeAvatarBtn && mainAvatarIcon) {
            removeAvatarBtn.addEventListener('click', () => {
                alert('Avatar removed! Resetting to default initials.');
                
                // Erase the background image and put "RB" back
                mainAvatarIcon.style.backgroundImage = 'none';
                mainAvatarIcon.innerHTML = 'RB'; 
                
                // Clear the internal file input so they can upload again
                if (avatarUpload) avatarUpload.value = ''; 
            });
        }

        // 4. Save Button Logic
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                // This is where our API fetch() will go eventually!
                alert('Success: Profile details have been saved!');
            });
        }

        //5. Universal Sub-Tab Switcher Logic
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    
    const targetId = btn.getAttribute('data-target');
    if (!targetId) return;

    // Handle button states within the same group
    const parentNav = btn.parentElement;
    parentNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    // Handle content panels visibility
    const scope = btn.closest('main') || document.body;
    scope.querySelectorAll('.tab-content').forEach(panel => {
        panel.style.display = 'none';
    });
    
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
        targetPanel.style.display = 'block';
    }
});
});