package com.example.smartfianacetracker.activities;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.Toast;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.preference.PreferenceManager;
import com.example.smartfianacetracker.R;
import com.example.smartfianacetracker.SmsService;
import com.example.smartfianacetracker.databinding.ActivityMainBinding;
import com.example.smartfianacetracker.utils.FirebaseManager;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.FirebaseApp;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import android.widget.TextView;
import android.widget.ImageView;
import android.net.Uri;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final int PERMISSIONS_REQUEST_CODE = 123;

    private ActivityMainBinding binding;
    private boolean isServiceRunning = false;
    private SwitchMaterial serviceToggle;
    private SharedPreferences sharedPreferences;
    private FirebaseManager firebaseManager;

    private List<String> requiredPermissions = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        try {
            super.onCreate(savedInstanceState);
            Log.d(TAG, "Starting MainActivity");

            // Initialize required permissions
            initializePermissions();

            // Initialize Firebase
            if (!isFirebaseInitialized()) {
                FirebaseApp.initializeApp(this);
                Log.d(TAG, "Firebase initialized");
            }

            // Initialize FirebaseManager
            firebaseManager = FirebaseManager.getInstance(this);

            // Check authentication status first
            if (!checkAuthenticationStatus()) {
                Log.d(TAG, "Authentication failed, redirecting to login");
                redirectToLogin();
                return;
            }

            Log.d(TAG, "Authentication successful, proceeding with main activity");

            // Setup view binding
            binding = ActivityMainBinding.inflate(getLayoutInflater());
            setContentView(binding.getRoot());

            // Setup toolbar
            setSupportActionBar(binding.toolbar);
            if (getSupportActionBar() != null) {
                getSupportActionBar().setTitle("Smart FinBuddy");
            }

            // Display user information
            displayUserInfo();

            // Initialize Firebase structure for authenticated user
            initializeFirebaseStructure();

            // Initialize preferences and toggle
            setupPreferencesAndToggle();

            // Setup web app button
            setupWebAppButton();

            // Start entrance animations
            startEntranceAnimations();

            // Check permissions immediately when app starts
            if (!areAllPermissionsGranted()) {
                showPermissionExplanationDialog();
            } else {
                initializeServiceIfEnabled();
            }

            Log.d(TAG, "MainActivity onCreate completed");
        } catch (Exception e) {
            Log.e(TAG, "Error in onCreate", e);
            handleError("Error initializing app", e);
        }
    }

    private void initializePermissions() {
        requiredPermissions.add(Manifest.permission.RECEIVE_SMS);
        requiredPermissions.add(Manifest.permission.READ_SMS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requiredPermissions.add(Manifest.permission.POST_NOTIFICATIONS);
        }
    }

    private boolean checkAuthenticationStatus() {
        try {
            FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
            boolean isLoggedInPrefs = firebaseManager.isLoggedIn();

            Log.d(TAG, "Firebase current user: " + (currentUser != null ? currentUser.getEmail() : "null"));
            Log.d(TAG, "Preferences logged in: " + isLoggedInPrefs);

            // If there's inconsistency in authentication state, clear everything
            if (currentUser == null && isLoggedInPrefs) {
                Log.w(TAG, "Inconsistent auth state: clearing preferences");
                clearAuthenticationData();
                return false;
            }

            if (currentUser != null && !isLoggedInPrefs) {
                Log.w(TAG, "Inconsistent auth state: Firebase user exists but prefs say not logged in");
                clearAuthenticationData();
                return false;
            }

            boolean isAuthenticated = currentUser != null && isLoggedInPrefs;
            Log.d(TAG, "Final authentication status: " + isAuthenticated);

            return isAuthenticated;
        } catch (Exception e) {
            Log.e(TAG, "Error checking authentication status", e);
            clearAuthenticationData();
            return false;
        }
    }

    private void clearAuthenticationData() {
        try {
            Log.d(TAG, "Clearing authentication data");
            FirebaseAuth.getInstance().signOut();
            com.example.smartfianacetracker.utils.PreferenceManager preferenceManager =
                new com.example.smartfianacetracker.utils.PreferenceManager(this);
            preferenceManager.clearSession();
        } catch (Exception e) {
            Log.e(TAG, "Error clearing authentication data", e);
        }
    }

    private void redirectToLogin() {
        Log.d(TAG, "Redirecting to login");
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void displayUserInfo() {
        FirebaseUser currentUser = firebaseManager.getCurrentUser();
        if (currentUser != null) {
            String email = currentUser.getEmail() != null ? currentUser.getEmail() : "Unknown";
            String displayName = currentUser.getDisplayName() != null ?
                currentUser.getDisplayName() : email.substring(0, email.indexOf("@"));

            // Update toolbar subtitle with user info
            if (getSupportActionBar() != null) {
                getSupportActionBar().setSubtitle("Welcome, " + displayName);
            }

            // Update user info card
            updateUserInfoCard(displayName, email);

            Log.d(TAG, "User logged in: " + email);
        } else {
            Log.e(TAG, "No authenticated user found in displayUserInfo");
            // This should not happen if authentication check passed
            redirectToLogin();
        }
    }

    private void updateUserInfoCard(String displayName, String email) {
        try {
            TextView userNameText = findViewById(R.id.userNameText);
            TextView userEmailText = findViewById(R.id.userEmailText);

            if (userNameText != null) {
                userNameText.setText("Welcome, " + displayName);
            }
            if (userEmailText != null) {
                userEmailText.setText(email);
            }

            // Update service status
            updateServiceStatus();
        } catch (Exception e) {
            Log.e(TAG, "Error updating user info card", e);
        }
    }

    private void updateServiceStatus() {
        try {
            TextView serviceStatusText = findViewById(R.id.serviceStatusText);
            ImageView serviceStatusIcon = findViewById(R.id.serviceStatusIcon);

            boolean isServiceEnabled = sharedPreferences.getBoolean("service_enabled", false);

            if (serviceStatusText != null && serviceStatusIcon != null) {
                if (isServiceEnabled) {
                    serviceStatusText.setText("Service: Active");
                } else {
                    serviceStatusText.setText("Service: Inactive");
                }

                // Use animated color change
                animateServiceToggle(isServiceEnabled);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating service status", e);
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        int itemId = item.getItemId();
        if (itemId == R.id.action_logout) {
            showLogoutConfirmation();
            return true;
        } else if (itemId == R.id.action_profile) {
            showUserProfile();
            return true;
        } else if (itemId == R.id.action_debug_clear_auth) {
            showDebugClearAuthConfirmation();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void showLogoutConfirmation() {
        new AlertDialog.Builder(this)
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Logout", (dialog, which) -> performLogout())
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void performLogout() {
        // Stop SMS service if running
        if (serviceToggle.isChecked()) {
            stopSmsService();
            serviceToggle.setChecked(false);
            sharedPreferences.edit().putBoolean("service_enabled", false).apply();
        }

        // Sign out from Firebase
        firebaseManager.signOut()
            .addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    Log.d(TAG, "Logout successful");
                    Toast.makeText(this, "Logged out successfully", Toast.LENGTH_SHORT).show();
                    redirectToLogin();
                } else {
                    Log.e(TAG, "Logout failed", task.getException());
                    Toast.makeText(this, "Logout failed", Toast.LENGTH_SHORT).show();
                }
            });
    }

    private void showUserProfile() {
        FirebaseUser currentUser = firebaseManager.getCurrentUser();
        if (currentUser != null) {
            String email = currentUser.getEmail() != null ? currentUser.getEmail() : "Unknown";
            String displayName = currentUser.getDisplayName() != null ? currentUser.getDisplayName() : "Not set";
            String uid = currentUser.getUid();

            new AlertDialog.Builder(this)
                .setTitle("User Profile")
                .setMessage("Email: " + email + "\nDisplay Name: " + displayName + "\nUser ID: " + uid)
                .setPositiveButton("OK", null)
                .show();
        }
    }

    private void showDebugClearAuthConfirmation() {
        new AlertDialog.Builder(this)
            .setTitle("Debug: Clear Authentication")
            .setMessage("This will clear all authentication data and redirect to login. Use this to test the login flow.")
            .setPositiveButton("Clear Auth", (dialog, which) -> {
                clearAuthenticationData();
                Toast.makeText(this, "Authentication data cleared", Toast.LENGTH_SHORT).show();
                redirectToLogin();
            })
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void setupPreferencesAndToggle() {
        sharedPreferences = PreferenceManager.getDefaultSharedPreferences(this);
        serviceToggle = findViewById(R.id.serviceToggle);

        // Initialize switch state from preferences
        serviceToggle.setChecked(sharedPreferences.getBoolean("service_enabled", false));

        serviceToggle.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                if (areAllPermissionsGranted()) {
                    startSmsService();
                } else {
                    showPermissionExplanationDialog();
                    serviceToggle.setChecked(false);
                }
            } else {
                stopSmsService();
            }
            sharedPreferences.edit().putBoolean("service_enabled", isChecked).apply();

            // Update service status display
            updateServiceStatus();
        });
    }

    private void setupWebAppButton() {
        try {
            findViewById(R.id.webAppButton).setOnClickListener(v -> {
                try {
                    // Open the web application link
                    String webAppUrl = "https://skn-hackfest.web.app/home";
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(webAppUrl));
                    startActivity(intent);
                    Toast.makeText(this, "Opening Smart FinBuddy Web App...", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Log.e(TAG, "Error opening web app", e);
                    Toast.makeText(this, "Unable to open web app", Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Error setting up web app button", e);
        }
    }

    private boolean areAllPermissionsGranted() {
        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    private void showPermissionExplanationDialog() {
        new AlertDialog.Builder(this)
            .setTitle("Permissions Required")
            .setMessage("Smart FinBuddy needs SMS and notification permissions to monitor your transactions through SMS messages. Please grant these permissions to continue.")
            .setPositiveButton("Grant Permissions", (dialog, which) -> requestPermissions())
            .setNegativeButton("Cancel", (dialog, which) ->
                Toast.makeText(this, "App requires permissions to function properly", Toast.LENGTH_LONG).show())
            .setCancelable(false)
            .show();
    }

    private void requestPermissions() {
        ActivityCompat.requestPermissions(
            this,
            requiredPermissions.toArray(new String[0]),
            PERMISSIONS_REQUEST_CODE
        );
    }

    private void initializeServiceIfEnabled() {
        if (sharedPreferences.getBoolean("service_enabled", false)) {
            startSmsService();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }

            if (allGranted) {
                Log.d(TAG, "All permissions granted");
                Toast.makeText(this, "Permissions granted successfully", Toast.LENGTH_SHORT).show();
                initializeServiceIfEnabled();
            } else {
                Log.w(TAG, "Some permissions denied");
                Toast.makeText(this, "App needs all permissions to function properly", Toast.LENGTH_LONG).show();
                serviceToggle.setChecked(false);
                sharedPreferences.edit().putBoolean("service_enabled", false).apply();
            }
        }
    }

    private boolean isFirebaseInitialized() {
        try {
            FirebaseApp.getInstance();
            return true;
        } catch (IllegalStateException e) {
            return false;
        }
    }

    private void initializeFirebaseStructure() {
        try {
            Log.d(TAG, "Initializing Firebase structure for authenticated user");
            FirebaseDatabase database = FirebaseDatabase.getInstance("https://skn-hackfest-default-rtdb.asia-southeast1.firebasedatabase.app/");
            database.setPersistenceEnabled(true);

            FirebaseUser currentUser = firebaseManager.getCurrentUser();
            if (currentUser != null) {
                database.getReference("users").child(currentUser.getUid())
                    .child("lastLogin").setValue(System.currentTimeMillis())
                    .addOnSuccessListener(aVoid -> Log.d(TAG, "User last login updated"))
                    .addOnFailureListener(e -> Log.e(TAG, "Failed to update last login", e));

                // Test connection
                database.getReference("users").child(currentUser.getUid())
                    .child("service_status").setValue("connected_" + System.currentTimeMillis())
                    .addOnSuccessListener(aVoid -> Log.d(TAG, "Firebase connection test successful"))
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "Firebase connection test failed", e);
                        handleError("Database connection failed", e);
                    });
            }
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Firebase", e);
            handleError("Firebase initialization failed", e);
        }
    }

    private void startSmsService() {
        try {
            Intent serviceIntent = new Intent(this, SmsService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Toast.makeText(this, "SMS monitoring service started", Toast.LENGTH_SHORT).show();

            // Update service status display
            updateServiceStatus();
        } catch (Exception e) {
            Log.e(TAG, "Error starting service: " + e.getMessage());
            Toast.makeText(this, "Failed to start service", Toast.LENGTH_SHORT).show();
            serviceToggle.setChecked(false);
            sharedPreferences.edit().putBoolean("service_enabled", false).apply();

            // Update service status display
            updateServiceStatus();
        }
    }

    private void stopSmsService() {
        try {
            stopService(new Intent(this, SmsService.class));
            Toast.makeText(this, "SMS monitoring service stopped", Toast.LENGTH_SHORT).show();

            // Update service status display
            updateServiceStatus();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping service: " + e.getMessage());
            Toast.makeText(this, "Failed to stop service", Toast.LENGTH_SHORT).show();
        }
    }

    private void handleError(String message, Exception error) {
        String errorMessage = message + ": " + error.getMessage();
        Log.e(TAG, errorMessage, error);
        Toast.makeText(this, errorMessage, Toast.LENGTH_LONG).show();
    }

    private void startEntranceAnimations() {
        try {
            // Animate toolbar
            if (binding != null && binding.toolbar != null) {
                Animation slideDown = AnimationUtils.loadAnimation(this, R.anim.slide_in_right);
                binding.toolbar.startAnimation(slideDown);
            }

            // Animate user info card
            Animation bounceIn = AnimationUtils.loadAnimation(this, R.anim.bounce_in);
            bounceIn.setStartOffset(300);
            findViewById(R.id.userInfoCard).startAnimation(bounceIn);

            // Animate service control card
            Animation fadeIn = AnimationUtils.loadAnimation(this, R.anim.fade_in);
            fadeIn.setStartOffset(600);
            findViewById(R.id.serviceControlCard).startAnimation(fadeIn);
            serviceToggle.startAnimation(fadeIn);

        } catch (Exception e) {
            Log.e(TAG, "Error in entrance animations", e);
        }
    }

    private void animateServiceToggle(boolean isActive) {
        try {
            TextView serviceStatusText = findViewById(R.id.serviceStatusText);
            ImageView serviceStatusIcon = findViewById(R.id.serviceStatusIcon);

            if (serviceStatusText != null && serviceStatusIcon != null) {
                // Scale animation for status change
                Animation scaleAnimation = AnimationUtils.loadAnimation(this, R.anim.bounce_in);
                serviceStatusText.startAnimation(scaleAnimation);
                serviceStatusIcon.startAnimation(scaleAnimation);

                // Color transition effect
                if (isActive) {
                    serviceStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_active));
                    serviceStatusIcon.setColorFilter(ContextCompat.getColor(this, R.color.status_active));
                } else {
                    serviceStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_inactive));
                    serviceStatusIcon.setColorFilter(ContextCompat.getColor(this, R.color.status_inactive));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error in service toggle animation", e);
        }
    }

    @Override
    public void finish() {
        super.finish();
        overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
    }
}
