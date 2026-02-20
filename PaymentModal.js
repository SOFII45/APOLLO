import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { createPayment, extractError } from '../services/api';
import { C, F, R, S } from '../constants/theme';

const fmt = (v) => `₺${Number(v || 0).toFixed(2)}`;

export default function PaymentModal({ visible, order, onClose, onDone }) {
  const [payQty,  setPayQty]  = useState({});
  const [receipt, setReceipt] = useState(false);
  const [paying,  setPaying]  = useState(false);

  // Reset every time the modal opens for a new order
  useEffect(() => {
    if (!visible || !order?.items) return;
    const init = {};
    order.items.forEach(i => { init[i.id] = 0; });
    setPayQty(init);
    setReceipt(false);
  }, [visible, order?.id]);

  const items = order?.items ?? [];

  const total = items.reduce((sum, item) => {
    const qty   = payQty[item.id] ?? 0;
    const price = Number(item.price_at_order ?? 0);
    return sum + price * qty;
  }, 0);

  const changeQty = (itemId, delta, max) => {
    setPayQty(prev => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(max, (prev[itemId] ?? 0) + delta)),
    }));
  };

  const selectAll = () => {
    const all = {};
    items.forEach(i => { all[i.id] = i.quantity; });
    setPayQty(all);
  };

  const clearAll = () => {
    const none = {};
    items.forEach(i => { none[i.id] = 0; });
    setPayQty(none);
  };

  const handlePay = async (method) => {
    if (total <= 0)  { Alert.alert('Uyarı', 'En az bir ürün seçin.'); return; }
    if (!receipt)    { Alert.alert('Uyarı', '"Fiş Kesildi" kutusunu işaretleyin.'); return; }

    setPaying(true);
    try {
      if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createPayment(order.id, total.toFixed(2), method);
      onDone();
    } catch (e) {
      Alert.alert('Hata', extractError(e));
    } finally {
      setPaying(false);
    }
  };

  const canPay = receipt && total > 0 && !paying;
  const remaining = Number(order?.remaining_balance ?? order?.total_amount ?? 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Ödeme Al</Text>
              <Text style={styles.subtitle}>Kalan: {fmt(remaining)}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick buttons */}
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtnAmber} onPress={selectAll}>
              <Text style={styles.quickBtnTxt}>Tümünü Seç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtnGhost} onPress={clearAll}>
              <Text style={[styles.quickBtnTxt, { color: C.inkMid }]}>Temizle</Text>
            </TouchableOpacity>
          </View>

          {/* Item list */}
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.length === 0 && (
              <Text style={styles.empty}>Sepet boş</Text>
            )}
            {items.map(item => {
              const qty   = payQty[item.id] ?? 0;
              const price = Number(item.price_at_order ?? 0);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemMeta}>
                      {fmt(price)} × {item.quantity} adet
                    </Text>
                  </View>

                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => changeQty(item.id, -1, item.quantity)}
                    >
                      <Text style={styles.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyVal, qty > 0 && styles.qtyValActive]}>{qty}</Text>
                    <TouchableOpacity
                      style={[styles.qtyBtn, qty >= item.quantity && styles.qtyBtnDisabled]}
                      onPress={() => changeQty(item.id, +1, item.quantity)}
                      disabled={qty >= item.quantity}
                    >
                      <Text style={styles.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.rowTotal, qty > 0 && styles.rowTotalActive]}>
                    {qty > 0 ? fmt(price * qty) : '—'}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Total bar */}
          <View style={styles.totalBar}>
            <Text style={styles.totalLbl}>Ödenecek</Text>
            <Text style={styles.totalAmt}>{fmt(total)}</Text>
          </View>

          {/* Receipt checkbox */}
          <TouchableOpacity
            style={styles.receiptRow}
            onPress={() => setReceipt(p => !p)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, receipt && styles.checkboxOn]}>
              {receipt && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.receiptLbl}>Fiş Kesildi</Text>
          </TouchableOpacity>

          {/* Pay buttons */}
          {paying ? (
            <ActivityIndicator size="large" color={C.amber} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.payBtn, styles.cashBtn, !canPay && styles.payBtnOff]}
                onPress={() => handlePay('cash')}
                disabled={!canPay}
                activeOpacity={0.8}
              >
                <Text style={styles.payBtnIcon}>💵</Text>
                <Text style={styles.payBtnTxt}>Nakit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.payBtn, styles.cardBtn, !canPay && styles.payBtnOff]}
                onPress={() => handlePay('card')}
                disabled={!canPay}
                activeOpacity={0.8}
              >
                <Text style={styles.payBtnIcon}>💳</Text>
                <Text style={styles.payBtnTxt}>Kart</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    padding: 22,
    maxHeight: '88%',
    ...S.float,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: F.xl,
    fontWeight: '800',
    color: C.inkDark,
  },
  subtitle: {
    fontSize: F.sm,
    color: C.inkLight,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { fontSize: F.sm, color: C.inkMid, fontWeight: '700' },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickBtnAmber: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.amber,
  },
  quickBtnGhost: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: R.full,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderPane,
  },
  quickBtnTxt: {
    color: C.inkDark,
    fontWeight: '700',
    fontSize: F.sm,
  },

  list: { maxHeight: 260 },
  empty: {
    textAlign: 'center',
    color: C.inkLight,
    paddingVertical: 20,
    fontSize: F.md,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: C.borderPane,
    gap: 10,
  },
  itemName: { fontSize: F.md, fontWeight: '700', color: C.inkDark },
  itemMeta: { fontSize: F.xs, color: C.inkLight, marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.borderPane,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { opacity: 0.35 },
  qtyBtnTxt: { fontSize: F.lg, color: C.inkDark, lineHeight: 22 },
  qtyVal: {
    fontSize: F.md,
    fontWeight: '800',
    minWidth: 26,
    textAlign: 'center',
    color: C.inkLight,
  },
  qtyValActive: { color: C.inkDark },
  rowTotal: {
    fontSize: F.sm,
    fontWeight: '700',
    color: C.inkLight,
    minWidth: 64,
    textAlign: 'right',
  },
  rowTotalActive: { color: C.amberDark },

  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 2,
    borderColor: C.borderPane,
    marginTop: 4,
  },
  totalLbl: { fontSize: F.lg, fontWeight: '700', color: C.inkMid },
  totalAmt: { fontSize: F.xxl, fontWeight: '800', color: C.inkDark },

  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: R.sm,
    borderWidth: 2,
    borderColor: C.inkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: C.success, borderColor: C.success },
  checkmark: { color: C.white, fontWeight: '800', fontSize: F.sm },
  receiptLbl: { fontSize: F.md, fontWeight: '700', color: C.inkDark },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: R.lg,
    gap: 8,
  },
  cashBtn:    { backgroundColor: C.success },
  cardBtn:    { backgroundColor: C.inkDark },
  payBtnOff:  { opacity: 0.38 },
  payBtnIcon: { fontSize: F.lg },
  payBtnTxt:  { color: C.white, fontWeight: '800', fontSize: F.md },
});
