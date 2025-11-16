export const options = { headerShown: false };
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Privacy Policy for QuackPlan</Text>
          <Text style={styles.lastUpdated}>Last Updated: November 14, 2025</Text>
        </View>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.text}>
            Welcome to QuackPlan ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our event planning and booking platform.
          </Text>
          <Text style={styles.text}>
            By using QuackPlan, you agree to the collection and use of information in accordance with this policy.
          </Text>
        </View>

        {/* Information We Collect */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Information We Collect</Text>
          
          <Text style={styles.subTitle}>2.1 Personal Information You Provide</Text>
          <Text style={styles.text}>When you register and use our services, we collect:</Text>
          
          <Text style={styles.boldText}>For All Users:</Text>
          <Text style={styles.bulletText}>• Email address (required)</Text>
          <Text style={styles.bulletText}>• Password (encrypted and stored securely)</Text>
          <Text style={styles.bulletText}>• Full name</Text>
          <Text style={styles.bulletText}>• Phone number (optional)</Text>
          <Text style={styles.bulletText}>• Date of birth (optional)</Text>
          <Text style={styles.bulletText}>• Location/address (optional)</Text>
          <Text style={styles.bulletText}>• Profile picture (optional)</Text>
          <Text style={styles.bulletText}>• Biography/description (optional)</Text>
          
          <Text style={styles.boldText}>For Vendor Accounts:</Text>
          <Text style={styles.bulletText}>• Academy/business name</Text>
          <Text style={styles.bulletText}>• Specializations and service categories</Text>
          <Text style={styles.bulletText}>• Business address</Text>
          <Text style={styles.bulletText}>• Business phone number</Text>
          <Text style={styles.bulletText}>• Verification documents</Text>
        </View>

        {/* How We Use Your Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          
          <Text style={styles.subTitle}>3.1 Service Delivery</Text>
          <Text style={styles.bulletText}>• Create and manage user accounts</Text>
          <Text style={styles.bulletText}>• Process event bookings and manage waitlists</Text>
          <Text style={styles.bulletText}>• Enable vendors to create and manage events</Text>
          <Text style={styles.bulletText}>• Facilitate communication between vendors and customers</Text>
          <Text style={styles.bulletText}>• Manage personal calendars and scheduling</Text>
          
          <Text style={styles.subTitle}>3.2 Communication</Text>
          <Text style={styles.bulletText}>• Send booking confirmations and updates</Text>
          <Text style={styles.bulletText}>• Notify users of event changes or cancellations</Text>
          <Text style={styles.bulletText}>• Send promotional communications (with your consent)</Text>
          <Text style={styles.bulletText}>• Respond to inquiries and provide customer support</Text>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Security</Text>
          <Text style={styles.text}>
            We implement industry-standard security measures to protect your information:
          </Text>
          <Text style={styles.bulletText}>• Encryption: Passwords are hashed using bcrypt with salt rounds</Text>
          <Text style={styles.bulletText}>• Secure Authentication: JWT-based authentication</Text>
          <Text style={styles.bulletText}>• Database Security: Secure MongoDB connections with access controls</Text>
          <Text style={styles.bulletText}>• HTTPS: All data transmission is encrypted</Text>
          <Text style={styles.bulletText}>• Access Controls: Strict access controls and authorization checks</Text>
          <Text style={styles.bulletText}>• Rate Limiting: Protection against brute-force attacks</Text>
          <Text style={styles.text}>
            However, no method of transmission over the internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
          </Text>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
          
          <Text style={styles.subTitle}>7.1 Access and Correction</Text>
          <Text style={styles.text}>
            You can access and update your personal information through your account settings.
          </Text>
          
          <Text style={styles.subTitle}>7.2 Account Deletion</Text>
          <Text style={styles.text}>
            You may request deletion of your account by contacting us. Note that some information may be retained for legal compliance.
          </Text>
          
          <Text style={styles.subTitle}>7.3 Communication Preferences</Text>
          <Text style={styles.text}>
            You can opt-out of promotional communications while still receiving booking confirmations and important account notifications.
          </Text>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.text}>
            If you have questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:contact.quackplan@gmail.com')}>
            <Text style={styles.linkText}>Email: contact.quackplan@gmail.com</Text>
          </TouchableOpacity>
          <Text style={styles.text}>
            For data protection inquiries, please include "Privacy Request" in the subject line.
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Summary of Key Points</Text>
          <Text style={styles.summaryText}>✅ What We Collect: Email, name, contact info, booking data, usage information</Text>
          <Text style={styles.summaryText}>✅ Why We Collect: Provide services, process bookings, improve platform, communicate with you</Text>
          <Text style={styles.summaryText}>✅ Who We Share With: Other users (as needed), service providers, legal authorities (when required)</Text>
          <Text style={styles.summaryText}>✅ Your Rights: Access, correct, delete your data; opt-out of communications</Text>
          <Text style={styles.summaryText}>✅ Security: Industry-standard encryption and security measures</Text>
          <Text style={styles.summaryText}>✅ Contact: contact.quackplan@gmail.com for any privacy concerns</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for trusting QuackPlan with your information. We are committed to protecting your privacy and providing you with transparency about our data practices.
          </Text>
          <Text style={styles.footerBrand}>QuackPlan 🦆 - Your Privacy, Our Priority</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  boldText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6B7280',
    marginBottom: 8,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    marginLeft: 8,
    marginBottom: 4,
  },
  linkText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
    marginVertical: 8,
  },
  summaryBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 6,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
});
