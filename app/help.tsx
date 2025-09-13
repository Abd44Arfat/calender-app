import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import { router } from 'expo-router';

export default function HelpScreen() {
  const faqData = [
    {
      question: "How do I book an event?",
      answer: "Navigate to the Events tab, find an event you're interested in, and tap the 'Book' button. You'll receive a confirmation once the booking is successful."
    },
    {
      question: "Can I cancel my booking?",
      answer: "Yes, you can cancel your booking from the Home screen. Find your booking in the 'My Bookings' section and tap the 'Cancel' button."
    },
    {
      question: "How do I create an event as a vendor?",
      answer: "If you're a vendor, you can create events by tapping the floating action button in the Events tab and filling out the event details form."
    },
    {
      question: "How do I update my profile?",
      answer: "Go to the Profile tab and tap 'Edit Profile' to update your personal information, including your profile picture."
    },
    {
      question: "What if I forget my password?",
      answer: "You can change your password from the Profile tab by selecting 'Change Password' and following the prompts."
    }
  ];

  const contactMethods = [
    {
      title: "Email Support",
      subtitle: "Get help via email",
      icon: "mail-outline",
      action: () => Linking.openURL("mailto:support@calendarapp.com")
    },
    {
      title: "Live Chat",
      subtitle: "Chat with our support team",
      icon: "chatbubble-outline",
      action: () => console.log("Open live chat")
    },
    {
      title: "Phone Support",
      subtitle: "Call us directly",
      icon: "call-outline",
      action: () => Linking.openURL("tel:+1234567890")
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          {contactMethods.map((method, index) => (
            <TouchableOpacity key={index} style={styles.contactItem} onPress={method.action}>
              <View style={styles.contactIcon}>
                <Ionicons name={method.icon as any} size={24} color="#EF4444" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactSubtitle}>{method.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqData.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2024.1</Text>
          </View>
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
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#111827',
  },
  infoValue: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});
