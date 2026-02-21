import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, useWindowDimensions,
  ActivityIndicator, StatusBar,
  ScrollView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getTables, getOpenOrders } from '../services/api';
import { C, F, R, S } from '../constants/theme';
import PinModal from '../components/PinModal';
import usePolling from '../hooks/usePolling';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function getTableColor(t, hasItems) {
  if (t.table_type === 'guest')    return { bg: '#6C5CE7', border: '#4B3FBF' };
  if (t.table_type === 'delivery') return { bg: '#0984E3', border: '#0652A3' };
  if (t.status === 'occupied' && hasItems) return { bg: '#D63031', border: '#9B1C1C' };
  return { bg: '#00B894', border: '#008E6B' };
}

function getTableLabel(t) {
  if (t.table_type === 'guest')    return 'Misafir';
  if (t.table_type === 'delivery') return `Kurye ${t.table_number}`;
  return `Masa ${t.table_number}`;
}

function getTableStatus(t, hasItems) {
  return (t.status === 'occupied' && hasItems) ? 'Dolu' : 'Boş';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function TablesScreen({ navigation }) {
  const { width } = useWindowDimensions();

  // Responsive kolon sayısı (WEB için optimize)
  let columns = 2;
  if (width > 1600) columns = 6;
  else if (width > 1200) columns = 5;
  else if (width > 900) columns = 4;
  else if (width > 600) columns = 3;

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinVisible, setPinVisible] = useState(false);

  const orderDetails = useRef({});

  const fetchData = useCallback(async () => {
    try {
      const [tbl, orders] = await Promise.all([
        getTables(),
        getOpenOrders()
      ]);

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
    } catch {}
    finally { setLoading(false); }
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

  const handlePress = (table) => {
    const existingOrder = orderDetails.current[table.id];

    navigation.navigate('Order', {
      orderId: existingOrder ? existingOrder.id : null,
      tableId: table.id,
      tableName: getTableLabel(table),
    });
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

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>☕ Kafe POS</Text>
        <Text style={styles.subtitle}>{tables.length} Masa</Text>
      </View>

      {/* SCROLLABLE GRID */}
      <ScrollView
        contentContainerStyle={[
          styles.grid,
          { gridTemplateColumns: `repeat(${columns}, 1fr)` }
        ]}
        style={{ flex: 1 }}
      >
        {tables.map((item) => {
          const tableInfo = orderDetails.current[item.id];
          const hasItems = tableInfo?.hasItems;
          const { bg, border } = getTableColor(item, hasItems);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => handlePress(item)}
              activeOpacity={0.85}
              style={[
                styles.card,
                {
                  backgroundColor: bg,
                  borderColor: border,
                }
              ]}
            >
              <Text style={styles.cardTitle}>
                {getTableLabel(item)}
              </Text>

              <Text style={styles.cardStatus}>
                {getTableStatus(item, hasItems)}
              </Text>

              {hasItems && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ADMIN BUTTON */}
      <TouchableOpacity
        style={styles.adminBtn}
        onPress={() => setPinVisible(true)}
      >
        <Text style={styles.adminTxt}>⚙ Admin</Text>
      </TouchableOpacity>

      <PinModal
        visible={pinVisible}
        onClose={() => setPinVisible(false)}
        onSuccess={() => {
          setPinVisible(false);
          navigation.navigate('Admin');
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadTxt: {
    marginTop: 12,
    color: '#AAA',
  },

  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#2C2C3E',
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },

  subtitle: {
    fontSize: 14,
    color: '#AAA',
    marginTop: 4,
  },

  grid: {
    padding: 24,
    gap: 20,
    display: Platform.OS === 'web' ? 'grid' : 'flex',
  },

  card: {
    borderRadius: 18,
    padding: 28,
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    transitionDuration: '200ms', // web hover smooth
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },

  cardStatus: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.9,
  },

  dot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD166',
  },

  adminBtn: {
    position: 'fixed',
    bottom: 30,
    right: 30,
    backgroundColor: '#2C2C3E',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: '#3A3A55',
  },

  adminTxt: {
    color: '#FFF',
    fontWeight: '700',
  },
});
