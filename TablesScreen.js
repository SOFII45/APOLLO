import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, useWindowDimensions,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTables, getOpenOrders, extractError } from '../services/api';
import { C, F, R, S } from '../constants/theme';
import PinModal from '../components/PinModal';
import usePolling from '../hooks/usePolling';

// ── Table display helpers ─────────────────────────────────────────────────────

function getTableColor(t, hasItems) {
  if (t.table_type === 'guest')    return { bg: C.purple,  border: C.purpleDark };
  if (t.table_type === 'delivery') return { bg: C.blue,    border: C.blueDark };
  // SADECE masa 'occupied' ise VE içinde ürün (hasItems) varsa kırmızı olsun
  if (t.status === 'occupied' && hasItems) return { bg: C.red, border: C.redDark };
  return { bg: C.green, border: C.greenDark };
}

function getTableLabel(t) {
  if (t.table_type === 'guest')    return 'Misafir';
  if (t.table_type === 'delivery') return `Kurye\n${t.table_number}`;
  return `Masa\n${t.table_number}`;
}

function getTableStatus(t, hasItems) {
  return (t.status === 'occupied' && hasItems) ? 'Dolu' : 'Boş';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TablesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const columns   = width < 480 ? 2 : width < 768 ? 3 : 4;

  const [tables,   setTables]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pressing, setPressing] = useState(null);
  const [pinVisible, setPinVisible] = useState(false);

  // Map tableId → { id: orderId, hasItems: boolean }
  const orderDetails = useRef({});

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [tbl, orders] = await Promise.all([getTables(), getOpenOrders()]);

      const map = {};
      orders.forEach(o => { 
        if (!o.is_paid) {
          map[o.table] = {
            id: o.id,
            hasItems: o.items && o.items.length > 0
          };
        } 
      });
      orderDetails.current = map;

      setTables(tbl);
    } catch {
      // Silently ignore polling errors
    } finally {
      setLoading(false);
    }
  }, []);

  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      fetchData();
      return () => setFocused(false);
    }, [fetchData])
  );
  usePolling(fetchData, 3000, focused);

  // ── Press handler ───────────────────────────────────────────────────────────
  const handlePress = (table) => {
    // Tıklandığında sipariş oluşturmuyoruz, sadece bilgiyi taşıyoruz
    const existingOrder = orderDetails.current[table.id];
    navigation.navigate('Order', {
      orderId:   existingOrder ? existingOrder.id : null,
      tableId:   table.id,
      tableName: getTableLabel(table).replace('\n', ' '),
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderTable = ({ item }) => {
    const tableInfo = orderDetails.current[item.id];
    const hasItems = tableInfo?.hasItems;
    const { bg, border } = getTableColor(item, hasItems);
    const isLoading = pressing === item.id;
    const cardSize  = (width - (columns + 1) * 12) / columns;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: bg,
            borderColor: border,
            width: cardSize,
            height: cardSize * 0.82,
          },
          S.card,
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.78}
        disabled={!!pressing}
      >
        {isLoading ? (
          <ActivityIndicator color={C.white} size="large" />
        ) : (
          <>
            <Text style={styles.cardNum}>{getTableLabel(item)}</Text>
            <View style={[styles.statusBadge, (item.status === 'occupied' && hasItems) && styles.statusBadgeOcc]}>
              <Text style={styles.statusTxt}>{getTableStatus(item, hasItems)}</Text>
            </View>
            {hasItems && (
              <View style={styles.dotBadge} />
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.amber} />
        <Text style={styles.loadTxt}>Masalar yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bgDark} />

      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>☕ Kafe POS</Text>
          <Text style={styles.headerSub}>{tables.length} masa</Text>
        </View>
        <View style={styles.legendRow}>
          {[
            { color: C.green,  label: 'Boş' },
            { color: C.red,    label: 'Dolu' },
            { color: C.purple, label: 'Misafir' },
            { color: C.blue,   label: 'Teslimat' },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendTxt}>{l.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={tables}
        keyExtractor={t => String(t.id)}
        numColumns={columns}
        key={`grid-${columns}`}
        contentContainerStyle={styles.grid}
        renderItem={renderTable}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.adminBtn}
        onPress={() => setPinVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.adminTxt}>⚙️  Admin</Text>
      </TouchableOpacity>

      <PinModal
        visible={pinVisible}
        onClose={() => setPinVisible(false)}
        onSuccess={() => { setPinVisible(false); navigation.navigate('Admin'); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bgDark, gap: 12 },
  loadTxt: { color: C.txtSecond, fontSize: F.md },
  headerBar: {
    backgroundColor: C.bgMid,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerTitle: { fontSize: F.xl, fontWeight: '800', color: C.txtPrimary, letterSpacing: 0.5 },
  headerSub: { fontSize: F.sm, color: C.txtSecond, marginTop: 2 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 10, height: 10, borderRadius: 5 },
  legendTxt:  { fontSize: F.xs, color: C.txtSecond },
  grid: { padding: 12, paddingBottom: 90, gap: 12 },
  card: {
    margin: 0,
    borderRadius: R.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    padding: 10,
    overflow: 'hidden',
  },
  cardNum: {
    color: C.white,
    fontSize: F.xl,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: F.xl * 1.25,
  },
  statusBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderRadius: R.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusBadgeOcc: { backgroundColor: 'rgba(0,0,0,0.22)' },
  statusTxt: { color: C.white, fontSize: F.xs, fontWeight: '700' },
  dotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.amber,
    borderWidth: 1.5,
    borderColor: C.white,
  },
  adminBtn: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    backgroundColor: C.bgLight,
    borderRadius: R.full,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    ...S.card,
  },
  adminTxt: { color: C.txtPrimary, fontWeight: '700', fontSize: F.sm },
});