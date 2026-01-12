const handleUpdateProfile = async () => {
    // 1. Validation
    if (!username.trim()) {
      showError(t('general.error'), t('profile.noUserName', 'Username is required'));
      return;
    }

    if (password && password !== confirmPassword) {
      showError(t('general.error'), t('login.passwordsNoMatch', 'Passwords do not match'));
      return;
    }

    // If nothing changed, just go back
    if (username === profile?.username && !password) {
      router.back();
      return;
    }

    setLoading(true);
    
    try {
      // 2. Update Username First (Database Operation)
      // We do this first because we need the current session to be valid.
      if (username !== profile?.username) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ username: username.trim() })
          .eq('id', profile?.id);

        if (profileError) throw profileError;
      }

      // 3. Update Password Second (Auth Operation)
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password });
        
        if (passwordError) throw passwordError;

        // CASE A: Password Changed -> Manual Logout & Redirect
        // Stop loading BEFORE navigating to prevent memory leaks
        setLoading(false); 
        
        // Show success message
        showSuccess(t('general.success'), t('login.passwordUpdated', 'Password updated. Please log in again.'));
        
        // Sign out explicitly
        await supabase.auth.signOut();

        // FORCE navigation to login (replace ensures they can't go back)
        // Adjust the path '/login' to match your actual route structure (e.g., '/(auth)/login')
        router.replace('/login'); 
        return;
      }

      // CASE B: Only Username changed -> Refresh & Go Back
      await refreshProfile(); // Await this to ensure UI updates before going back
      setLoading(false);
      showSuccess(t('general.success'), t('profile.updateSuccess', 'Profile updated successfully'));
      router.back();

    } catch (error: any) {
      setLoading(false);
      console.error("Profile Update Error:", error);
      showError(t('general.error'), error.message || t('general.errorOccurred'));
    }
  };