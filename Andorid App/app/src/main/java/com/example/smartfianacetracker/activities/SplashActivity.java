package com.example.smartfianacetracker.activities;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.example.smartfianacetracker.R;
import com.example.smartfianacetracker.utils.FirebaseManager;
import com.google.firebase.FirebaseApp;

public class SplashActivity extends AppCompatActivity {
    private static final int SPLASH_DURATION = 3000; // 3 seconds
    
    private ImageView appLogo;
    private TextView appName;
    private TextView appTagline;
    private FirebaseManager firebaseManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_splash);

        // Initialize views
        initializeViews();
        
        // Initialize Firebase
        initializeFirebase();
        
        // Start animations
        startAnimations();
        
        // Navigate to next screen after delay
        navigateToNextScreen();
    }

    private void initializeViews() {
        appLogo = findViewById(R.id.appLogo);
        appName = findViewById(R.id.appName);
        appTagline = findViewById(R.id.appTagline);
    }

    private void initializeFirebase() {
        try {
            FirebaseApp.initializeApp(this);
            firebaseManager = FirebaseManager.getInstance(this);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void startAnimations() {
        // Logo bounce animation
        Animation bounceAnimation = AnimationUtils.loadAnimation(this, R.anim.bounce_in);
        appLogo.startAnimation(bounceAnimation);

        // App name fade in animation (delayed)
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Animation fadeInAnimation = AnimationUtils.loadAnimation(this, R.anim.fade_in);
            appName.startAnimation(fadeInAnimation);
        }, 500);

        // Tagline fade in animation (more delayed)
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            Animation fadeInAnimation = AnimationUtils.loadAnimation(this, R.anim.fade_in);
            appTagline.startAnimation(fadeInAnimation);
        }, 1000);
    }

    private void navigateToNextScreen() {
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            // Check if user is already logged in
            if (firebaseManager != null && firebaseManager.isLoggedIn()) {
                // User is logged in, go to MainActivity
                startActivity(new Intent(this, MainActivity.class));
            } else {
                // User not logged in, go to LoginActivity
                startActivity(new Intent(this, LoginActivity.class));
            }
            
            // Add transition animation
            overridePendingTransition(R.anim.fade_in, R.anim.fade_out);
            finish();
        }, SPLASH_DURATION);
    }

    @Override
    public void onBackPressed() {
        // Disable back button on splash screen
        // Do nothing
    }
}
