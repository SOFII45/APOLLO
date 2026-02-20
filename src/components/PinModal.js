import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Vibration, Platform,
} from 'react-native';
import { C, F, R, S } from '../constants/theme';

const ADMIN_PIN = '1881'; // ← change this

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinModal({ visible, onClose, onSuccess }) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!visible) { setInput(''); setShake(false); }
  }, [visible]);

  const handleKey = (key) => {
    if (key === '') return;
    if (key === '⌫') { setInput(p => p.slice(0, -1)); return; }

    const next = input + key;
    setInput(next);

    if (next.length === ADMIN_PIN.length) {
      if (next === ADMIN_PIN) {
        setInput('');
        onSuccess();
      } else {
        Platform.OS !== 'web' && Vibration.vibrate(400);
        setShake(true);
        setTimeout(() => { setInput(''); setShake(false); }, 700);
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Admin Girişi</Text>
          <Text style={styles.subtitle}>PIN kodunu girin</Text>

          <View style={styles.dotsRow}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[
                styles.dot,
                input.length > i && styles.dotFilled,
                shake && styles.dotError,
              ]} />
            ))}
          </View>

          {shake && <Text style={styles.errTxt}>Yanlış PIN</Text>}

          <View style={styles.keypad}>
            {KEYS.map((k, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, k === '' && styles.keyInvis]}
                onPress={() => handleKey(k)}
                disabled={k === ''}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyTxt, k === '⌫' && { fontSize: F.lg }]}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>İptal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: C.bgMid,
    borderRadius: R.xl,
    padding: 28,
    width: 300,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    ...S.card,
  },
  title: {
    fontSize: F.xl,
    fontWeight: '800',
    color: C.txtPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: F.sm,
    color: C.txtSecond,
    marginTop: 4,
    marginBottom: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.txtDim,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  dotError: {
    backgroundColor: C.danger,
    borderColor: C.danger,
  },
  errTxt: {
    color: C.danger,
    fontSize: F.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 222,
    marginTop: 16,
    gap: 6,
  },
  key: {
    width: 68,
    height: 58,
    backgroundColor: C.bgLight,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  keyInvis: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyTxt: {
    fontSize: F.xxl,
    fontWeight: '600',
    color: C.txtPrimary,
  },
  cancelBtn: {
    marginTop: 20,
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelTxt: {
    color: C.txtSecond,
    fontWeight: '600',
    fontSize: F.md,
  },
});
